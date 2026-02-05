---
id: T-add-abortcontroller-support
title: Add AbortController support to LLM layer (LLMService + AnthropicProvider)
status: done
priority: high
parent: F-stop-agent-while-processing
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
log:
  - >-
    Research phase complete. Verified:

    1. All three files exist: src/llm/types.ts, src/llm/AnthropicProvider.ts,
    src/llm/LLMService.ts

    2. APIUserAbortError is exported from @anthropic-ai/sdk and extends APIError

    3. SDK RequestOptions accepts signal?: AbortSignal

    4. No project-specific tests exist yet

    5. classifyError() currently checks Anthropic.APIError first - must add
    abort check before it

    Beginning implementation.
  - 'Added AbortController support to the LLM layer (LLMService +
    AnthropicProvider). The implementation threads an AbortSignal from
    LLMService through AnthropicProvider to the Anthropic SDK, enabling
    in-flight API requests to be cancelled. Key changes: (1) Extended
    LLMErrorCode with "aborted" and added LLMError.aborted() factory method, (2)
    Updated LLMProvider interface with signal parameter, (3) AnthropicProvider
    passes signal to SDK via RequestOptions and classifies APIUserAbortError
    before APIError, (4) LLMService manages AbortController lifecycle, checks
    abort before tool loop iterations, catches abort errors gracefully, and
    exposes a public abort() method. All quality checks pass (lint, format,
    type-check) and build succeeds.'
schema: v1.0
childrenIds: []
created: 2026-02-05T20:13:47.292Z
updated: 2026-02-05T20:13:47.292Z
---

# Add AbortController Support to LLM Layer

## Purpose
Thread an `AbortController` through the LLM call chain so that in-flight API requests can be cancelled from outside.

## Files to Modify

### `src/llm/types.ts`

**Change 1: Extend `LLMErrorCode` type union (line 186)**
- Current: `"auth_error" | "rate_limit" | "network" | "invalid_request" | "unknown"`
- New: `"auth_error" | "rate_limit" | "network" | "invalid_request" | "aborted" | "unknown"`

**Change 2: Add `aborted()` static factory method to `LLMError` class (after line 243, following the `unknown()` factory)**
```typescript
static aborted(message: string): LLMError {
  return new LLMError(message, "aborted", false);
}
```
The `retryable` parameter is `false` -- aborted requests should never be retried.

**Change 3: Update `LLMProvider` interface `sendMessage()` signature (line 171)**
- Current: `sendMessage(messages: LLMMessage[], tools?: Tool[], systemPrompt?: string): Promise<LLMResponse>;`
- New: `sendMessage(messages: LLMMessage[], tools?: Tool[], systemPrompt?: string, signal?: AbortSignal): Promise<LLMResponse>;`
- Add the `signal` as the 4th optional parameter

### `src/llm/AnthropicProvider.ts`

**Change 1: Update `sendMessage()` signature (line 63-67)**
- Add `signal?: AbortSignal` as the 4th parameter:
```typescript
async sendMessage(
  messages: LLMMessage[],
  tools?: Tool[],
  systemPrompt?: string,
  signal?: AbortSignal
): Promise<LLMResponse> {
```

**Change 2: Pass signal to `this.client.messages.create()` (line 79-85)**
The Anthropic SDK's `messages.create()` accepts a second argument of type `RequestOptions` which contains an optional `signal` field. Pass it as:
```typescript
const response = await this.client.messages.create(
  {
    model: this.model,
    max_tokens: DEFAULT_MAX_TOKENS,
    messages: anthropicMessages,
    ...(anthropicTools && anthropicTools.length > 0 && { tools: anthropicTools }),
    ...(systemPrompt && { system: systemPrompt }),
  },
  { signal }
);
```
Note: The `{ signal }` object is the `RequestOptions` second argument, NOT spread into the body.

**Change 3: Add `APIUserAbortError` check in `classifyError()` BEFORE the `APIError` check (line 222-224)**
This is CRITICAL because `APIUserAbortError extends APIError`. If the `instanceof Anthropic.APIError` check runs first, it will catch abort errors and misclassify them. Add this check BEFORE line 224:
```typescript
if (error instanceof Anthropic.APIUserAbortError) {
  return LLMError.aborted("Request was cancelled by user.");
}
```
The full method should check in this order:
1. `Anthropic.APIUserAbortError` -- returns `LLMError.aborted()` (non-retryable)
2. `Anthropic.APIError` -- existing status-based classification
3. Generic `Error` -- existing network error detection
4. Unknown fallback

No additional imports are needed since `APIUserAbortError` is accessible as `Anthropic.APIUserAbortError`.

### `src/llm/LLMService.ts`

**Change 1: Add `abortController` field (after line 53)**
```typescript
private abortController: AbortController | null = null;
```

**Change 2: Create AbortController at start of `processMessage()` (after line 130, before adding user message)**
```typescript
this.abortController = new AbortController();
```

**Change 3: Pass signal to both `provider.sendMessage()` calls**
- Initial call (line 145): Add `this.abortController.signal` as 4th argument
```typescript
let response = await this.provider.sendMessage(
  this.conversationHistory,
  toolDefs.length > 0 ? toolDefs : undefined,
  systemPrompt,
  this.abortController.signal
);
```
- Continuation call (line 173): Same pattern
```typescript
response = await this.provider.sendMessage(
  this.conversationHistory,
  toolDefs.length > 0 ? toolDefs : undefined,
  systemPrompt,
  this.abortController.signal
);
```

**Change 4: Check abort before each tool use loop iteration (after line 153)**
Add at the top of the while loop body, before processing tool calls:
```typescript
if (this.abortController?.signal.aborted) {
  break;
}
```

**Change 5: Clean up AbortController after processing completes (after line 184, before `trimHistory()`)**
```typescript
this.abortController = null;
```

**Change 6: Wrap the entire processMessage body in try/catch for abort errors**
Wrap everything after the initialized check in a try/catch. In the catch block:
```typescript
try {
  // ... existing processMessage body ...
} catch (error) {
  this.abortController = null;
  if (error instanceof LLMError && error.code === "aborted") {
    // Return a benign response -- the user message is already in history
    return {
      content: [],
      stopReason: "end_turn",
    };
  }
  throw error; // Re-throw non-abort errors
}
```
Note: The user message is added to `conversationHistory` at the very start (line 133-136), BEFORE any API call, so it will always be recorded even on abort.

**Change 7: Add public `abort()` method (after `clearHistory()` at line 198)**
```typescript
/**
 * Abort the current in-flight LLM request.
 * Safe to call at any time -- no-op if not currently processing.
 */
abort(): void {
  this.abortController?.abort();
  this.abortController = null;
}
```

## Acceptance Criteria
- [ ] `LLMService.abort()` exists and can be called safely at any time (no-op if not processing)
- [ ] AbortSignal propagates from LLMService through AnthropicProvider to the Anthropic SDK via the `RequestOptions` second argument
- [ ] `APIUserAbortError` is caught in `classifyError()` before the generic `APIError` check, returning `LLMError.aborted()`
- [ ] Aborted requests do not trigger retry logic in AnthropicProvider (LLMError with code `"aborted"` is non-retryable)
- [ ] AbortError is caught gracefully in `processMessage()` by checking `error.code === 'aborted'` -- no unhandled exceptions
- [ ] The tool use loop checks for abort before each iteration
- [ ] processMessage() still adds the user message to conversation history even when aborted
- [ ] `LLMErrorCode` type includes `"aborted"` and `LLMError.aborted()` factory method exists