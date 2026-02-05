---
id: F-conversation-retrospection
title: Conversation Retrospection
status: in-progress
priority: medium
parent: none
prerequisites: []
affectedFiles:
  src/settings.ts: Added enableConversationRetrospection and retrospectionPrompt
    fields to SmartHoleSettings interface, created DEFAULT_RETROSPECTION_PROMPT
    constant, added both fields to DEFAULT_SETTINGS, and added toggle + textarea
    UI controls in the settings tab display() method
  src/main.ts: Added extraction logic for enableConversationRetrospection
    (boolean) and retrospectionPrompt (string) in extractSettings() method;
    Added RetrospectionCallback import and onRetrospection() delegation method
  src/retrospection/RetrospectionService.ts: "New file: RetrospectionService class
    with runRetrospection(), buildPrompt(), formatEntry(), and
    persistRetrospection() methods"
  src/retrospection/index.ts: "New file: barrel exports for RetrospectionService
    and RetrospectionResult type"
  tests/retrospection/RetrospectionService.test.ts: "New file: 11 unit tests
    covering buildPrompt (8 tests) and formatEntry (3 tests)"
  src/processor/types.ts: Added RetrospectionCallback type definition after AgentMessageCallback
  src/processor/index.ts: Added RetrospectionCallback to type exports
  src/processor/MessageProcessor.ts: Added imports for RetrospectionService and
    Conversation; added retrospectionCallbacks array, onRetrospection()
    subscribe method, notifyRetrospection() and runRetrospection() methods;
    wired Trigger Path A (end_conversation tool) and Trigger Path B (idle
    timeout) into processWithRetry()
log:
  - >-
    Completed comprehensive implementation plan for all 4 tasks. Each task body
    now includes:

    - Exact file paths and line numbers referencing the current codebase

    - Code snippets following existing patterns (callback subscribe/unsubscribe,
    LLMService instantiation, settings extraction, CSS variables)

    - Detailed integration points in processWithRetry() for both trigger paths

    - Test plan for RetrospectionService pure functions

    - Acceptance criteria per task


    Task dependency graph:

    - T-add-retrospection-settings (no prerequisites) — can start immediately

    - T-create-retrospectionservice (no prerequisites) — can start in parallel
    with settings

    - T-integrate-retrospection (depends on settings + service) — must wait for
    both above

    - T-add-retrospection-display-to (depends on integration) — must wait for
    integration


    Key findings from codebase analysis:

    - ConversationManager.getConversation(id) already exists (line 293) — no new
    method needed

    - end_conversation tool runs during processMessage(), so toolsUsed array
    reliably contains it

    - Idle timeout detection: compare active conversation ID before/after
    addMessage() call

    - .smarthole/ directory already exists from InboxManager — just need to
    create retrospection.md

    - vault.adapter.read/write handles both existing and non-existing files
    cleanly
schema: v1.0
childrenIds:
  - T-add-retrospection-display-to
  - T-integrate-retrospection
  - T-add-retrospection-settings
  - T-create-retrospectionservice
created: 2026-02-05T23:01:17.797Z
updated: 2026-02-05T23:01:17.797Z
---

## Purpose

Add a background retrospection system that triggers when conversations end, asking the LLM to reflect on opportunities for improvement (system prompts, vault knowledge, tooling, workflows). Insights are persisted to a vault file and displayed asynchronously in the ChatView as a distinct system message — without blocking the user from seeing the assistant's actual response.

Requirements document: `.trellis/requirements/conversation-retrospection.md`

## Key Components

### 1. New Settings (`src/settings.ts` + `src/main.ts`)

- **`enableConversationRetrospection: boolean`** — Toggle, default `false`. Add to `SmartHoleSettings` interface, `DEFAULT_SETTINGS`, `extractSettings()`, and the settings tab UI.
- **`retrospectionPrompt: string`** — Textarea, with a default prompt asking the LLM to reflect on: system prompt improvements, vault knowledge gaps, tooling opportunities, and workflow improvements. Add to same locations.

### 2. Retrospection Service (`src/retrospection/` — new module)

Create a `RetrospectionService` (or similar) responsible for:

- Accepting a completed `Conversation` object and settings
- Creating a **fresh `LLMService` instance** (separate from the one processing the current message) — follows the existing pattern in `MessageProcessor.processWithRetry()` where a new `LLMService` is created per message
- Building a prompt from the conversation's messages + the user's `retrospectionPrompt` setting
- Calling `llmService.processMessage()` with no tools registered (read-only reflection)
- Persisting the result to `.smarthole/retrospection.md` in the vault (prepend at top, dated Markdown section with conversation title)
- The `.smarthole/` directory already exists (used by `InboxManager`) — create `retrospection.md` if it doesn't exist
- Returning the retrospection content string for display

Entry format in `.smarthole/retrospection.md`:
```markdown
## [Conversation Title or "Untitled"] — [Date/Time]

[Retrospection content from LLM]

---
```

Most recent entries at the top of the file.

### 3. Trigger Integration (two paths in `src/processor/MessageProcessor.ts`)

Both trigger paths must check `this.settings.enableConversationRetrospection` before proceeding.

**Path A — Explicit `end_conversation` tool:**
- In `processWithRetry()`, after `llmService.processMessage()` returns and the response has been recorded, check if the `end_conversation` tool was called during this turn (detectable from tool calls in the response or from `conversationManager.getActiveConversation()` returning null)
- If so, launch retrospection as fire-and-forget: capture the ended conversation's data, then `void this.runRetrospection(conversation).catch(...)` — the `processWithRetry` method returns immediately without waiting

**Path B — Idle timeout:**
- In `processWithRetry()`, the call to `conversationManager.addMessage(userMessage, llmService)` triggers `endConversation()` when `shouldStartNewConversation()` returns true
- Before this call, capture the active conversation ID. After the call, check if the conversation was ended (active ID changed). If so, retrieve the ended conversation and launch retrospection in the background
- Alternative: modify `ConversationManager.addMessage()` to return metadata about whether a conversation was ended, or add a return value from `endConversation()` with the ended conversation object

### 4. ChatView Display (`src/views/ChatView.ts`)

**New callback pattern** — following the existing `onAgentMessage` / `onMessageResponse` subscribe/unsubscribe pattern:

- Add `retrospectionCallbacks: RetrospectionCallback[]` to `MessageProcessor`
- Add `onRetrospection(callback)` → returns unsubscribe function
- Wire through `SmartHolePlugin.onRetrospection()` (same delegation pattern as `onMessageResponse`, `onAgentMessage`, `onMessageReceived`)
- Subscribe in `ChatView.onOpen()`, unsubscribe in `ChatView.onClose()`

**Message rendering:**
- Extend `ChatMessage` with a new field: `type?: "retrospection"` (or add `"system"` to the `role` union)
- In `renderMessage()`, detect retrospection messages and apply a distinct CSS class (e.g., `smarthole-chat-message-retrospection`) for different visual styling
- The retrospection message appears below the last assistant message of the ended conversation, rendered asynchronously when the callback fires

**Styling** — add CSS rules in `styles.css` for the retrospection message bubble (subtle, visually distinct from assistant messages — e.g., muted colors, italic header, or a border treatment).

### 5. Non-Blocking Guarantee

- The retrospection LLM call runs in a **separate async task** — `void this.runRetrospection(...).catch(err => console.error(...))` — fire-and-forget
- It uses a separate `LLMService` instance, so it cannot interfere with active message processing
- If the retrospection call fails (network error, API error, etc.), log the error and silently move on
- The user sees the assistant's response at normal speed regardless of retrospection status

## Acceptance Criteria

- [ ] `enableConversationRetrospection` toggle exists in settings, defaults to `false`
- [ ] `retrospectionPrompt` textarea exists in settings with a well-crafted default
- [ ] When enabled, retrospection fires on explicit `end_conversation` tool calls
- [ ] When enabled, retrospection fires on idle-timeout conversation endings
- [ ] Retrospection runs fully in the background — no delay to assistant response delivery
- [ ] Insights are prepended to `.smarthole/retrospection.md` as dated Markdown sections
- [ ] A visually distinct system message appears in ChatView when retrospection completes
- [ ] Feature is completely inert when the setting is disabled
- [ ] Quality checks pass (`mise run quality`)

## Implementation Guidance

- Follow the existing `LLMService` instantiation pattern (constructor + `initialize()`) for the background call
- Follow the existing callback subscribe/unsubscribe pattern (`onMessageResponse`, `onAgentMessage`) for the new retrospection callback
- The `Conversation` type in `src/context/types.ts` has `title`, `summary`, and `messages` — all available for building the retrospection prompt
- `app.vault.adapter.read()` and `app.vault.adapter.write()` (or `vault.create()` / `vault.modify()`) can handle the `.smarthole/retrospection.md` file operations
- No tools should be registered on the retrospection LLMService — it's a read-only reflection, not a vault operation
- The settings reference is shared by reference (`this.settings`), so runtime toggles take effect immediately

## Testing Requirements

- Unit test the retrospection prompt building (conversation messages → formatted prompt)
- Unit test the `.smarthole/retrospection.md` file formatting (prepend logic, entry format)
- No integration or performance tests needed
