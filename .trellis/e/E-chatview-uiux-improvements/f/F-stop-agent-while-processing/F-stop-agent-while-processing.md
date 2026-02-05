---
id: F-stop-agent-while-processing
title: Stop Agent While Processing
status: in-progress
priority: medium
parent: E-chatview-uiux-improvements
prerequisites: []
affectedFiles:
  src/llm/types.ts: "Added 'aborted' to LLMErrorCode union type, added
    LLMError.aborted() static factory method (non-retryable), and added signal?:
    AbortSignal parameter to LLMProvider.sendMessage() interface"
  src/llm/AnthropicProvider.ts: "Added signal?: AbortSignal parameter to
    sendMessage(), passed { signal } as RequestOptions second argument to
    client.messages.create(), and added APIUserAbortError check BEFORE APIError
    check in classifyError() to prevent misclassification"
  src/llm/LLMService.ts: Added abortController field, create new AbortController
    at start of processMessage(), pass signal to both provider.sendMessage()
    calls, check abort before tool loop iterations, wrapped body in try/catch
    for abort errors (returns empty response), cleanup AbortController after
    processing, and added public abort() method
  src/processor/MessageProcessor.ts: Added `currentLLMService` field to track
    active LLM service, added `cancelCurrentProcessing()` public method, wrapped
    LLM creation block in try/finally for cleanup, added abort error detection
    before retry logic in catch block returning success:true with empty response
  src/main.ts: Added public `cancelCurrentProcessing()` method that delegates to
    `this.messageProcessor?.cancelCurrentProcessing()`
log:
  - Implementation plan completed. Analyzed all 7 source files that will be
    modified, verified Anthropic SDK's APIUserAbortError inheritance chain and
    RequestOptions signal support, and created detailed per-file change
    specifications for all 3 child tasks. Plan includes signal propagation chain
    diagram showing the full abort flow from UI click through to SDK
    cancellation.
schema: v1.0
childrenIds:
  - T-add-cancellation-support-to
  - T-add-stop-button-ui-to
  - T-add-abortcontroller-support
created: 2026-02-05T17:52:56.417Z
updated: 2026-02-05T17:52:56.417Z
---

# Stop Agent While Processing

## Implementation Plan

### Research Summary

**Key Findings**:
- The Anthropic SDK's `messages.create()` accepts a second `RequestOptions` argument with a `signal?: AbortSignal` field. When aborted, the SDK throws `APIUserAbortError` which extends `APIError` (inheritance chain: `APIUserAbortError -> APIError -> AnthropicError -> Error`).
- The `LLMService.processMessage()` method adds the user message to `conversationHistory` BEFORE any API call (line 133-136), so abort will never lose the user's message from local history.
- `AnthropicProvider.classifyError()` currently checks `instanceof Anthropic.APIError` first. Since `APIUserAbortError extends APIError`, we must add the abort check BEFORE the generic `APIError` check to avoid misclassification.
- The `processWithRetry()` method in `MessageProcessor` already has retry logic that checks `error.retryable`. Since `LLMError.aborted()` sets `retryable: false`, the existing retry guard will naturally prevent retries. However, we add an explicit early-return for abort errors to skip error notifications entirely.
- `ChatView` currently uses a local `sendButton` variable in `onOpen()`. This needs to be promoted to a class field so `setProcessingState()` can toggle its visibility.
- The `showTypingIndicator()` and `hideTypingIndicator()` methods are the natural integration points for processing state tracking.
- Obsidian's `setIcon()` with "square" provides the standard stop icon from the Lucide icon set.
- Obsidian's CSS variable `var(--text-error)` provides the standard red/destructive color.

**Assumptions**:
- Returning `{ success: true, response: "" }` for cancelled requests is preferable to a dedicated cancellation result type, since it avoids error notifications while keeping the API surface simple.
- User messages are NOT persisted to ConversationManager on cancellation (since there is no LLM response to record), but they are recorded in LLMService's local conversation history. This is acceptable.
- The stop button replaces the send button in the same DOM position (toggle visibility) rather than being a separate element, to avoid layout shifts.

### Overview
This feature adds the ability for users to cancel in-flight LLM API requests by clicking a stop button in the ChatView sidebar. The implementation threads an `AbortController` signal from the UI through `Plugin -> MessageProcessor -> LLMService -> AnthropicProvider -> Anthropic SDK`, with proper error classification and graceful cleanup at each layer. When cancelled, the UI immediately returns to its ready state without showing error notifications.

### Prerequisites
None -- all dependencies (AbortController, AbortSignal) are built into the browser/Electron runtime. The `APIUserAbortError` class is already available in the installed `@anthropic-ai/sdk` package.

### File Modifications

#### 1. MODIFY `src/llm/types.ts`
**Purpose**: Add the "aborted" error code and factory method to the type system
**Changes Required**:
- Add `"aborted"` to the `LLMErrorCode` type union (between `"invalid_request"` and `"unknown"`)
- Add static `LLMError.aborted(message: string)` factory method (after `unknown()`, returns non-retryable error)
- Add `signal?: AbortSignal` parameter to `LLMProvider.sendMessage()` interface signature (4th optional param)

#### 2. MODIFY `src/llm/AnthropicProvider.ts`
**Purpose**: Accept and pass AbortSignal to the SDK, classify abort errors correctly
**Changes Required**:
- Add `signal?: AbortSignal` as 4th parameter to `sendMessage()`
- Pass `{ signal }` as second argument to `this.client.messages.create()` (the `RequestOptions` parameter)
- Add `APIUserAbortError` check in `classifyError()` BEFORE the existing `APIError` check (critical: `APIUserAbortError extends APIError`)

#### 3. MODIFY `src/llm/LLMService.ts`
**Purpose**: Manage AbortController lifecycle and expose abort capability
**Changes Required**:
- Add `private abortController: AbortController | null = null` field
- Create new AbortController at start of `processMessage()`
- Pass `this.abortController.signal` to both `provider.sendMessage()` calls (initial + continuation)
- Check `this.abortController?.signal.aborted` before each tool use loop iteration
- Wrap processMessage body in try/catch for abort errors (return empty LLMResponse on abort, re-throw others)
- Clean up AbortController (`= null`) after processing completes or on abort
- Add public `abort()` method (calls `abortController?.abort()`, sets to null)

#### 4. MODIFY `src/processor/MessageProcessor.ts`
**Purpose**: Track active LLMService for cancellation, handle abort errors in retry logic
**Changes Required**:
- Add `private currentLLMService: LLMService | null = null` field
- Store LLMService reference after initialization in `processWithRetry()`
- Clear reference in a `finally` block to ensure cleanup on all code paths
- Add abort error detection (`error.code === "aborted"`) in catch block, before retry logic
- On abort: return `{ success: true, response: "", toolsUsed: [], isWaitingForResponse: false }` (no error notification)
- Add public `cancelCurrentProcessing()` method that calls `currentLLMService?.abort()`

#### 5. MODIFY `src/main.ts`
**Purpose**: Expose cancellation method on the Plugin for ChatView to call
**Changes Required**:
- Add public `cancelCurrentProcessing()` method that delegates to `this.messageProcessor?.cancelCurrentProcessing()`

#### 6. MODIFY `src/views/ChatView.ts`
**Purpose**: Add stop button UI and processing state management
**Changes Required**:
- Add `isProcessing`, `sendButton`, `stopButton` class fields
- Promote local `sendButton` variable to `this.sendButton` class field
- Create hidden stop button with "square" icon after send button
- Wire stop button click to `plugin.cancelCurrentProcessing()` + `setProcessingState(false)`
- Add `setProcessingState(processing: boolean)` method (toggles button visibility, calls `hideTypingIndicator()` on false)
- Update `showTypingIndicator()` to call `setProcessingState(true)`
- Replace `hideTypingIndicator()` calls with `setProcessingState(false)` in response callback and error handler
- Clean up button references and state in `onClose()`

#### 7. MODIFY `styles.css`
**Purpose**: Style the stop button to match send button dimensions with destructive color
**Changes Required**:
- Add `.smarthole-chat-stop` styles: same dimensions (40x40), border-radius, centering as `.smarthole-chat-send`
- Background: `var(--text-error)` (Obsidian's standard red/destructive color)
- Icon color: `var(--text-on-accent)` for contrast
- Hover: `filter: brightness(1.1)` (no `--text-error-hover` variable exists)
- Active: `transform: scale(0.95)` (matches send button)
- SVG: 18x18 (matches send button)

### Implementation Order

1. **`src/llm/types.ts`** -- Must be first. Defines the `"aborted"` error code, `LLMError.aborted()` factory, and updated `LLMProvider` interface that all other changes depend on.

2. **`src/llm/AnthropicProvider.ts`** -- Depends on types.ts changes. Implements the signal parameter and `APIUserAbortError` classification. Can be tested independently by manually aborting a request.

3. **`src/llm/LLMService.ts`** -- Depends on both types.ts and AnthropicProvider changes. Creates and manages the AbortController, exposes `abort()` method. This completes the LLM layer (Task 1).

4. **`src/processor/MessageProcessor.ts`** -- Depends on LLMService having `abort()`. Adds tracking and cancellation delegation. This is the orchestration layer (Task 2).

5. **`src/main.ts`** -- Depends on MessageProcessor having `cancelCurrentProcessing()`. Simple one-method addition (Task 2).

6. **`src/views/ChatView.ts`** + **`styles.css`** -- Depends on Plugin having `cancelCurrentProcessing()`. UI layer changes (Task 3). These two files can be modified in parallel since they are independent (TypeScript vs CSS).

### Signal Propagation Chain
```
User clicks stop button
  -> ChatView.stopButton.click()
    -> plugin.cancelCurrentProcessing()
      -> messageProcessor.cancelCurrentProcessing()
        -> llmService.abort()
          -> abortController.abort()
            -> AbortSignal fires
              -> Anthropic SDK throws APIUserAbortError
                -> AnthropicProvider.classifyError() -> LLMError.aborted()
                  -> LLMService.processMessage() catches, returns empty response
                    -> MessageProcessor.processWithRetry() catches, returns success
                      -> ChatView.setProcessingState(false) restores UI
```