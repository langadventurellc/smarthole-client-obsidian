---
id: T-fix-conversation-summary
title: Fix conversation summary reentrancy bug by using isolated LLMService
status: done
priority: high
parent: none
prerequisites: []
affectedFiles:
  src/llm/LLMService.ts: Added isProcessing flag and reentrancy guard to
    processMessage() that throws a clear error if called reentrantly. Resets in
    finally block.
  src/context/ConversationManager.ts: Changed endConversation() and
    generateConversationSummary() to accept app/settings instead of llmService.
    generateConversationSummary now creates a fresh isolated LLMService with
    Haiku model. Updated addMessage() to accept summaryContext object instead of
    llmService.
  src/llm/tools/endConversation.ts: Changed EndConversationContext interface to
    provide app/settings instead of getLLMService factory. Updated execute to
    pass app/settings to conversationManager.endConversation().
  src/processor/MessageProcessor.ts: Updated EndConversationContext creation to
    provide app/settings instead of getLLMService. Updated addMessage call to
    pass app/settings context object instead of llmService.
log:
  - Starting implementation. Research complete - all files identified and
    patterns understood. Following the generateCommitMessage pattern for
    creating isolated LLMService instances.
  - Fixed conversation summary reentrancy bug by creating isolated LLMService
    instances instead of reusing the active one. The fix follows the existing
    generateCommitMessage pattern. Added a reentrancy guard to
    LLMService.processMessage() as a safety net against future bugs. All quality
    checks pass (lint, format, type-check) and all 85 tests pass. Build failure
    is pre-existing (GitService.ts node builtins), not caused by these changes.
schema: v1.0
childrenIds: []
created: 2026-02-06T01:55:37.145Z
updated: 2026-02-06T01:55:37.145Z
---

## Problem

When the LLM calls `end_conversation` during tool execution, `generateConversationSummary` reuses the same `LLMService` instance that is mid-execution. This causes a reentrancy bug where `processMessage` is called while the outer `processMessage` hasn't yet added `tool_result` blocks to the conversation history, resulting in the Anthropic API rejecting the malformed message sequence:

```
messages.6: `tool_use` ids were found without `tool_result` blocks immediately after
```

### Root Cause Chain

1. Outer `processMessage` (LLMService.ts:159) receives an assistant response with `tool_use` blocks (e.g., `send_message` + `end_conversation`)
2. Assistant message is pushed to `conversationHistory` (line 168-171)
3. `executeToolCalls` begins iterating tools (line 174-175)
4. `end_conversation` tool executes → calls `conversationManager.endConversation(llmService)` → calls `generateConversationSummary(id, llmService)` → calls `llmService.processMessage(prompt)` (ConversationManager.ts:210)
5. The inner `processMessage` pushes a user message (the summary prompt) to the shared `conversationHistory` (LLMService.ts:137-140)
6. **At this point**, the history has an assistant message with `tool_use` blocks followed by a plain user message — the `tool_result` blocks were never added because the outer loop hasn't reached line 178-180 yet
7. The API rejects this malformed history

### Why It Correlates with Delete Operations

The bug isn't specific to `deleteFile` — it triggers whenever the LLM calls `end_conversation` as part of a tool batch. Delete-heavy operations (like splitting a note into two new files and removing the original) tend to conclude tasks, prompting the LLM to call `end_conversation`, which exposes the reentrancy.

## Solution

Create a **fresh, isolated LLMService instance** in `generateConversationSummary` instead of reusing the active one. This follows the existing proven pattern already used by `generateCommitMessage` in `MessageProcessor.ts:628`.

### Implementation Steps

1. **Modify `ConversationManager.generateConversationSummary`** (src/context/ConversationManager.ts:181-223):
   - Change the method signature to accept `app: App` and `settings: SmartHoleSettings` instead of (or in addition to) `llmService: LLMService`
   - Create a fresh `LLMService` instance inside the method, initialize it, and use it for the summary call
   - The fresh instance has an empty conversation history, no tools registered, and no shared state — completely isolated
   - Use Haiku model for cost efficiency (same as `generateCommitMessage`): override `settings.model` with `claude-haiku-4-5-20251001`

2. **Update `ConversationManager.endConversation`** (src/context/ConversationManager.ts:99-123):
   - Change the `llmService` parameter to accept `app` and `settings` instead
   - Pass them through to `generateConversationSummary`

3. **Update `endConversation` tool** (src/llm/tools/endConversation.ts):
   - Change `EndConversationContext` to provide `app: App` and `settings: SmartHoleSettings` instead of `getLLMService: () => LLMService`
   - Update the execute function to pass `app` and `settings` to `conversationManager.endConversation()`

4. **Update `MessageProcessor`** (src/processor/MessageProcessor.ts):
   - Update the `EndConversationContext` creation (lines 411-414) to provide `app` and `settings` instead of `getLLMService`
   - Update the `addMessage` call (line 459) that passes `llmService` for idle-timeout summary generation — this has the same reentrancy risk. Change `ConversationManager.addMessage` to accept `app` and `settings` instead of `llmService`

5. **Add a reentrancy guard to `LLMService.processMessage`** (src/llm/LLMService.ts:128):
   - Add a private `isProcessing` flag
   - At the start of `processMessage`, check the flag. If already processing, throw a clear error: `"LLMService.processMessage() called reentrantly — use a separate LLMService instance"`
   - Set the flag to `true` at entry, `false` in a `finally` block
   - This is a safety net to prevent future reentrancy bugs from silently corrupting state

### Files to Modify

| File | Change |
|------|--------|
| `src/context/ConversationManager.ts` | Change `endConversation` and `generateConversationSummary` to create isolated LLMService; update `addMessage` signature |
| `src/llm/tools/endConversation.ts` | Change `EndConversationContext` interface; pass `app`/`settings` instead of `getLLMService` |
| `src/processor/MessageProcessor.ts` | Update `EndConversationContext` and `addMessage` call sites |
| `src/llm/LLMService.ts` | Add reentrancy guard to `processMessage` |

## Acceptance Criteria

- [ ] `generateConversationSummary` creates its own isolated `LLMService` instance (never reuses the active one)
- [ ] The `end_conversation` tool no longer causes `invalid_request_error` about missing `tool_result` blocks
- [ ] `LLMService.processMessage` has a reentrancy guard that throws a clear error if called reentrantly
- [ ] `generateCommitMessage` pattern is followed: fresh service, Haiku model, no tools registered
- [ ] Idle-timeout summary generation in `addMessage` also uses isolated LLMService (same fix)
- [ ] Quality checks pass: `mise run quality`
- [ ] Build succeeds: `mise run build`

## Out of Scope

- Deferring summary generation to after `processMessage` completes (Option 2 from discovery — architecturally cleaner but more refactoring)
- Changing how `end_conversation` is called or its tool behavior
- Adding tests for reentrancy (existing test infrastructure doesn't mock the Anthropic API at this level)
- Refactoring `LLMService` to be stateless or use immutable history