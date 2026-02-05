---
id: T-include-recent-conversation
title: Include recent conversation summaries in new conversation context
status: done
priority: medium
parent: none
prerequisites: []
affectedFiles:
  src/context/ConversationManager.ts: "Added RECENT_SUMMARY_COUNT constant (line
    16). Rewrote getContextPrompt() (lines 262-290) to build a sections array:
    first a '## Recent Conversations' section from the last 2 ended
    conversations with non-null title/summary, then the existing '## Current
    Conversation' section for the active conversation. Returns empty string when
    both sections are empty."
log:
  - Modified `getContextPrompt()` in ConversationManager to prepend a `## Recent
    Conversations` section containing titles and summaries of the last 2 ended
    conversations. Added `RECENT_SUMMARY_COUNT = 2` constant. The method now
    filters conversations with non-null title and summary from
    `getRecentConversations()`, formats them as `### [Title] (ended [ISO
    timestamp])\n[Summary]`, and prepends them before the existing `## Current
    Conversation` section. When no qualifying recent conversations exist, the
    section is omitted entirely, preserving backward-compatible behavior.
schema: v1.0
childrenIds: []
created: 2026-02-05T21:06:40.773Z
updated: 2026-02-05T21:06:40.773Z
---

## Context

When a new conversation starts (first message ever, or after idle timeout), the LLM currently receives **no context** about past conversations in the system prompt. The only way it can access history is via the `get_conversation` tool on-demand — but it can't proactively use that tool if it doesn't know relevant context exists.

This task adds the last couple of conversation summaries to the system prompt so the LLM has immediate awareness of recent interactions when a new conversation begins. This provides continuity across conversation boundaries without requiring the LLM to guess that it should look up history.

The `get_conversation` tool remains valuable for deeper lookups; the summaries in the system prompt complement it by providing passive awareness.

## Implementation

### Primary Change: `src/context/ConversationManager.ts` — `getContextPrompt()`

Modify `getContextPrompt()` (currently lines 261-275) to prepend a `## Recent Conversations` section using data from the existing `getRecentConversations()` method.

**Current behavior:** Returns only `## Current Conversation\n[messages]` for the active conversation, or `""` if no active conversation.

**New behavior:** Prepend a `## Recent Conversations` section containing the title and summary of the last 2 ended conversations (those with non-null `title` and `summary`), followed by the existing `## Current Conversation` section.

**Format:**
```
## Recent Conversations
### [Title] (ended [ISO timestamp])
[Summary]

### [Title] (ended [ISO timestamp])
[Summary]

## Current Conversation
[existing messages...]
```

**Key details:**
- Use `getRecentConversations(2)` — the method already exists and returns ended conversations sorted by most recent first
- Filter out conversations where `title` or `summary` is null (e.g., conversations that ended without LLM summary generation)
- If no qualifying recent conversations exist, omit the `## Recent Conversations` section entirely
- The number of summaries to include (2) can be hardcoded as a constant (e.g., `RECENT_SUMMARY_COUNT = 2`) at the top of the file
- No changes needed to `MessageProcessor`, `LLMService`, or any other files — `getContextPrompt()` is the single integration point

### No Other Files Need Changes

- `MessageProcessor.processWithRetry()` already calls `getContextPrompt()` and pipes the result through `llmService.setConversationContext()` — no changes needed
- `LLMService.buildSystemPrompt()` already injects `conversationContext` into the system prompt — no changes needed
- Settings do not need a new option for the count; hardcoding 2 is sufficient for now

## Acceptance Criteria

- When a new conversation starts and there are ended conversations with summaries, the system prompt includes a `## Recent Conversations` section with up to 2 recent conversation summaries (title + summary text + ended timestamp)
- When there are no ended conversations (or none with summaries), no `## Recent Conversations` section appears — behavior is identical to current
- The `## Recent Conversations` section appears before the `## Current Conversation` section in the context prompt
- Conversations with null title or summary are excluded from the recent summaries section
- The existing `get_conversation` tool continues to work unchanged
- `mise run quality` passes

## Out of Scope

- Adding a settings UI option for the number of summaries to include
- Changing the `get_conversation` tool behavior
- Modifying how conversation summaries are generated
- Adding summaries to ChatView UI
- Any changes to `MessageProcessor` or `LLMService`