---
id: T-add-cancellation-support-to
title: Add cancellation support to MessageProcessor and Plugin
status: open
priority: high
parent: F-stop-agent-while-processing
prerequisites:
  - T-add-abortcontroller-support
affectedFiles: {}
log: []
schema: v1.0
childrenIds: []
created: 2026-02-05T20:13:59.809Z
updated: 2026-02-05T20:13:59.809Z
---

# Add Cancellation Support to MessageProcessor and Plugin

## Purpose
Expose a cancellation method through the MessageProcessor and Plugin layers so that the ChatView UI can trigger cancellation of in-flight LLM processing.

## Files to Modify

### `src/processor/MessageProcessor.ts`

**Change 1: Add `currentLLMService` field to track the active LLM service (after line 50, near other private fields)**
```typescript
/** Track the active LLM service instance for cancellation support */
private currentLLMService: LLMService | null = null;
```

**Change 2: Store LLMService reference in `processWithRetry()` (line 295, after creating the LLMService instance)**
After `await llmService.initialize();` (line 296), store the reference:
```typescript
this.currentLLMService = llmService;
```

**Change 3: Clear LLMService reference in a `finally` block**
Wrap the section from `const llmService = new LLMService(...)` through the `return { success: true, ... }` (lines 295-421) in a try/finally to ensure cleanup:
```typescript
try {
  const llmService = new LLMService(this.app, this.settings);
  await llmService.initialize();
  this.currentLLMService = llmService;
  
  // ... rest of the existing try block content ...
  
  return { success: true, response: textContent, toolsUsed, isWaitingForResponse };
} finally {
  this.currentLLMService = null;
}
```
Note: This try/finally should be INSIDE the existing for-loop's try/catch, wrapping only the LLM creation through the success return. The existing catch block continues to handle errors.

**Change 4: Detect abort errors in the catch block (line 422-443)**
Add a check for abort errors BEFORE the existing retry logic. When an abort is detected, do NOT retry and do NOT send error notifications:
```typescript
} catch (error) {
  // Check for abort/cancellation -- never retry, never notify
  if (error instanceof LLMError && error.code === "aborted") {
    console.log("MessageProcessor: Processing cancelled by user");
    return {
      success: true,
      response: "",
      toolsUsed: [],
      isWaitingForResponse: false,
    };
  }
  
  // ... existing error handling (isLLMError, isRetryable, etc.) ...
}
```
Key decisions:
- Return `success: true` with empty response so the caller does NOT send error notifications
- Return empty `toolsUsed` array and `isWaitingForResponse: false`
- Use `console.log` (not `console.error`) since this is intentional user action
- The `LLMError` import already exists on line 16

**Change 5: Add public `cancelCurrentProcessing()` method (after `initialize()` at line 72)**
```typescript
/**
 * Cancel the currently in-flight LLM processing.
 * Safe to call at any time -- no-op if not currently processing.
 */
cancelCurrentProcessing(): void {
  this.currentLLMService?.abort();
  this.currentLLMService = null;
}
```

### `src/main.ts`

**Change 1: Add `cancelCurrentProcessing()` method (after `processDirectMessage()` at line 263)**
```typescript
/**
 * Cancel the currently in-flight LLM processing.
 * Used by ChatView stop button to abort the active request.
 * Safe to call at any time -- no-op if not currently processing.
 */
cancelCurrentProcessing(): void {
  this.messageProcessor?.cancelCurrentProcessing();
}
```

## Important Implementation Notes

### Abort Error Detection
The error detection uses `error instanceof LLMError && error.code === "aborted"`, NOT `error.name === 'AbortError'`. The Anthropic SDK throws `APIUserAbortError`, which gets classified as `LLMError` with code `"aborted"` by `AnthropicProvider.classifyError()` (from Task 1). By the time the error reaches `processWithRetry()`, it is already an `LLMError`.

### Return Value on Cancellation
Returning `{ success: true, response: "", ... }` is intentional. In the `process()` method (line 188-237), a `success: true` result:
- Sends success notification for WebSocket messages (but empty string is harmless)
- Notifies response callbacks with `success: true`
- Deletes from inbox (cleanup is correct since we don't want to reprocess a cancelled message)

An alternative considered was `success: false` with a special error type, but that would trigger `sendErrorNotification()` which we explicitly want to avoid.

### Race Condition Safety
The pattern of `this.currentLLMService?.abort()` followed by `this.currentLLMService = null` is safe because:
1. If processing already completed, `currentLLMService` is already `null` (set in the `finally` block), so `?.abort()` is a no-op
2. If processing is in-flight, `abort()` signals the AbortController, and the `finally` block will also set `currentLLMService = null` when the processing completes/throws
3. Setting `null` twice is harmless

### Conversation History Preservation
The user message is recorded in conversation history by `LLMService.processMessage()` BEFORE any API call (line 133-136 in LLMService.ts). If the abort happens during the API call, the user message is already in `conversationHistory`. However, the `processWithRetry()` catch block for aborts returns early (before reaching lines 378-397 where messages are added to `ConversationManager`). This means the user's message will be in `LLMService`'s local history but NOT persisted to `ConversationManager`. This is acceptable since the LLM never responded, so there is no meaningful conversation turn to persist.

## Acceptance Criteria
- [ ] `MessageProcessor.cancelCurrentProcessing()` exists and safely cancels the active LLM call
- [ ] `SmartHolePlugin.cancelCurrentProcessing()` exists and delegates to MessageProcessor
- [ ] Aborted requests are detected via `error.code === 'aborted'` (not `error.name === 'AbortError'`)
- [ ] Aborted requests do not trigger retry logic in `processWithRetry()`
- [ ] No error notifications are sent via SmartHole for cancelled requests
- [ ] The user's original message is still recorded in LLMService's conversation history after cancellation
- [ ] Calling `cancelCurrentProcessing()` when no processing is active is a safe no-op
- [ ] Race condition safety: if processing completes between cancel request and abort execution, nothing breaks