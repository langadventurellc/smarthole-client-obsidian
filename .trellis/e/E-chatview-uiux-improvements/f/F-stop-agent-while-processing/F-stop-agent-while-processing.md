---
id: F-stop-agent-while-processing
title: Stop Agent While Processing
status: open
priority: medium
parent: E-chatview-uiux-improvements
prerequisites: []
affectedFiles: {}
log: []
schema: v1.0
childrenIds: []
created: 2026-02-05T17:52:56.417Z
updated: 2026-02-05T17:52:56.417Z
---

# Stop Agent While Processing

## Purpose
Allow users to cancel in-flight LLM API requests by clicking a stop button that appears when the agent is processing. This gives users control over long-running or unwanted requests without waiting for completion.

## Key Components to Implement

### 1. AbortController in LLMService (`src/llm/LLMService.ts`)
- Add `private abortController: AbortController | null = null` field
- Create new AbortController at start of `processMessage()`
- Pass `signal` to `provider.sendMessage()` calls
- Add `abort()` public method that calls `abortController?.abort()`
- Handle `AbortError` gracefully - don't throw, return early

### 2. AbortController in AnthropicProvider (`src/llm/AnthropicProvider.ts`)
- Update `sendMessage()` signature to accept optional `signal?: AbortSignal`
- Pass signal to Anthropic SDK client call
- Handle abort during tool use loop iterations

### 3. Cancellation Support in MessageProcessor (`src/processor/MessageProcessor.ts`)
- Store reference to current LLMService instance during processing
- Add `cancelCurrentProcessing()` public method
- Handle abort errors as non-retryable (don't trigger retry logic)
- Ensure user message is still recorded in conversation history
- Don't send error notifications for cancelled requests

### 4. Stop Button UI (`src/views/ChatView.ts`)
- Track `isProcessing: boolean` state (already have typing indicator, leverage that)
- When processing: hide send button, show stop button (square icon)
- Wire stop button to call `plugin.cancelCurrentProcessing()`
- On cancel: hide typing indicator, show send button

### 5. Plugin Integration (`src/main.ts`)
- Add `cancelCurrentProcessing()` method that delegates to MessageProcessor
- Expose method for ChatView to call

### 6. Styles (`styles.css`)
- `.smarthole-chat-stop` - stop button styling (similar to send button, different icon/color)

## Acceptance Criteria
- [ ] Stop button (square icon) appears when "Thinking..." indicator is shown
- [ ] Send button is hidden while processing
- [ ] Clicking stop aborts the API request immediately
- [ ] Typing indicator disappears after cancel
- [ ] UI returns to ready state (send button visible, input enabled)
- [ ] User's original message is preserved in conversation history
- [ ] No error notifications are shown for cancelled requests
- [ ] Cancellation works during tool use loops (not just initial request)

## Technical Requirements
- Use `setIcon()` with "square" icon for stop button
- AbortController signal must propagate through entire call chain
- Abort errors must be distinguishable from other errors (check `error.name === 'AbortError'`)
- Don't retry aborted requests in `processWithRetry()`

## Implementation Guidance
- LLMService creates AbortController, AnthropicProvider uses the signal
- MessageProcessor holds LLMService reference during processing, nulls it after
- ChatView tracks processing state via existing typing indicator logic
- Cancel should be safe to call even if not processing (no-op)

## Testing Requirements
- Verify stop button appears/disappears with processing state
- Verify clicking stop during API call cancels it
- Verify clicking stop during tool execution cancels it
- Verify user message remains in history after cancel
- Verify no error toast/notification after cancel
- Verify rapid start/stop doesn't cause race conditions

## Dependencies
- None (can be implemented independently)