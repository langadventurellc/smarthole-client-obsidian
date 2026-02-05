# Conversation Retrospection

## Overview

When a conversation ends, trigger a background LLM call that reflects on opportunities for improvement — better system prompts, more vault context, additional tooling, etc. Insights are persisted to a file in the vault and displayed in the ChatView as an async system message, without blocking the user from seeing the assistant's actual response.

## Motivation

The LLM agent interacts with the vault repeatedly over time. Each conversation is an opportunity to identify gaps — things the agent didn't know, tools it wished it had, system prompt instructions that were missing or unhelpful. By capturing these reflections, users gain actionable insights into how to improve their setup over time.

## Requirements

### 1. Setting: Enable Conversation Retrospection

- Add a boolean setting `enableConversationRetrospection` to `SmartHoleSettings`, defaulting to `false`
- Add the setting to the Settings tab UI as a toggle in a "Conversation" or related section
- Add the setting to `extractSettings()` in `main.ts`

### 2. Setting: Retrospection Prompt

- Add a string setting `retrospectionPrompt` to `SmartHoleSettings` with a well-crafted default prompt
- The default prompt should ask the LLM to reflect on:
  - System prompt improvements (missing instructions, unclear guidance)
  - Vault knowledge gaps (structure, naming conventions, content the agent didn't know about)
  - Tooling opportunities (actions the agent wished it could take but couldn't)
  - Workflow improvements (better ways to handle the type of request encountered)
- Display as a textarea in settings, allowing users to customize what the retrospection focuses on
- The prompt will receive the full conversation history as context

### 3. Trigger: Both Conversation-End Paths

Retrospection should run on both conversation-end triggers:

- **Explicit**: When the LLM agent calls the `end_conversation` tool
- **Idle timeout**: When a conversation ends because the idle timeout has elapsed (detected on next message arrival in `ConversationManager.addMessage()`)

In both cases, retrospection runs only if `enableConversationRetrospection` is `true`.

### 4. Non-Blocking Background Execution

- Retrospection MUST NOT block or delay the user from seeing the assistant's response
- When triggered via `end_conversation` tool: the tool call completes normally, the assistant's response is shown, and retrospection runs in the background afterward
- When triggered via idle timeout: the new message is processed normally, and retrospection on the *previous* conversation runs in the background
- Retrospection uses a separate LLM call (not the same LLMService instance processing the current message) to avoid interference
- The retrospection LLM call should receive the conversation's messages as context along with the customizable retrospection prompt
- If the retrospection call fails, log the error but do not surface it to the user (fire-and-forget with error logging)

### 5. Persistence: `.smarthole/retrospection.md`

- Retrospection insights are appended to `.smarthole/retrospection.md` in the vault
- Each entry is formatted as a dated Markdown section:
  ```markdown
  ## [Conversation Title or "Untitled"] — [Date/Time]

  [Retrospection content from LLM]

  ---
  ```
- The file is created if it doesn't exist
- New entries are appended at the top (most recent first)
- This file is NOT injected into future conversation system prompts (persist-only, for user review)

### 6. ChatView Display: Separate System Message

- When retrospection completes, a distinct message bubble appears in the ChatView below the conversation's last assistant message
- This message should be visually distinct from regular assistant messages (different styling — e.g., a "system" or "retrospection" style)
- The message appears asynchronously — it is NOT present when the assistant's response first renders
- If the ChatView is open when retrospection completes, the message should appear without requiring a refresh
- If the ChatView is not open or has been navigated away from, the message can be omitted from display (the insights are already persisted to the file)
- The message content should be the retrospection output from the LLM

### 7. Model Usage

- The retrospection LLM call should use the same model configured in settings (`settings.model`) — it follows the user's existing model preference
- It should use a fresh LLMService/provider instance to avoid interfering with any active processing

## Out of Scope

- Automatic injection of retrospection insights into future system prompts (user can manually incorporate insights)
- Retrospection on conversations that have already ended before this feature is enabled
- Rate limiting or deduplication of retrospection entries
- UI for browsing/managing retrospection history (the Markdown file serves this purpose)

## Definition of Done

- [ ] New `enableConversationRetrospection` toggle setting (default: off)
- [ ] New `retrospectionPrompt` textarea setting with sensible default
- [ ] Retrospection triggers on both `end_conversation` tool calls and idle timeout conversation endings
- [ ] Retrospection runs in the background without blocking the assistant's response
- [ ] Insights are appended to `.smarthole/retrospection.md` in the vault
- [ ] A visually distinct system message appears in the ChatView when retrospection completes
- [ ] Feature does nothing when the setting is disabled
- [ ] Quality checks pass (`mise run quality`)
