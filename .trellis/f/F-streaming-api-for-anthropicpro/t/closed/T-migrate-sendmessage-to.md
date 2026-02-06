---
id: T-migrate-sendmessage-to
title: Migrate sendMessage to streaming with abort and micro-agent opt-out
status: done
priority: high
parent: F-streaming-api-for-anthropicpro
prerequisites:
  - T-add-model-aware-max-output
affectedFiles:
  src/llm/AnthropicProvider.ts: Added streaming constructor option (default true),
    extracted sendStreaming() and sendNonStreaming() private methods, updated
    sendMessage() to dispatch based on this.streaming flag
  src/llm/LLMService.ts: "Added optional { streaming?: boolean } third parameter
    to constructor, forwarded to AnthropicProvider"
  src/processor/MessageProcessor.ts: "Passed { streaming: false } to LLMService for commit message generation"
  src/retrospection/RetrospectionService.ts: "Passed { streaming: false } to LLMService for retrospection"
  src/context/ConversationManager.ts: "Passed { streaming: false } to LLMService
    for conversation summary generation"
  src/settings.ts: "Passed { streaming: false } to LLMService for routing
    description generation"
log:
  - >-
    Research complete. Key findings:

    - SDK v0.39.0 confirmed with `messages.stream()` and `MessageStream`
    available

    - `MessageStream.abort()` and `MessageStream.finalMessage()` both present

    - `MessageStreamParams` = `MessageCreateParamsBase` (same as create minus
    stream field)

    - `finalMessage()` returns `Promise<Message>` — same type as `create()`

    - 5 callers to update: MessageProcessor (primary agent + commit),
    RetrospectionService, ConversationManager, settings.ts

    - LLMService constructor currently takes (app, settings), creates
    AnthropicProvider(settings.model)

    - Plan: Add `streaming` option to AnthropicProvider constructor, add
    `streaming` option to LLMService constructor, pass `false` from micro-agent
    callers
  - "Migrated AnthropicProvider.sendMessage() to use streaming
    (messages.stream() + finalMessage()) by default, with a non-streaming
    fallback for micro-agent callers. Added a `streaming` boolean constructor
    option to both AnthropicProvider (default true) and LLMService (forwarded to
    provider). The streaming path bridges the existing AbortSignal to
    stream.abort() via addEventListener/removeEventListener in a finally block.
    The non-streaming path uses messages.create() with explicit stream:false for
    type narrowing. All micro-agent callers (commit messages, retrospection,
    conversation summaries, settings description generation) now pass {
    streaming: false }. The primary agent path uses the default streaming=true.
    Retry logic wraps both paths identically. Quality checks pass."
schema: v1.0
childrenIds: []
created: 2026-02-06T04:28:05.013Z
updated: 2026-02-06T04:28:05.013Z
---

## Purpose

Migrate `AnthropicProvider.sendMessage()` from `client.messages.create()` to `client.messages.stream()` + `stream.finalMessage()` for the primary agent path. This eliminates HTTP timeout restrictions and enables the max_tokens ceiling to be raised. Micro-agent callers (commit messages, retrospection, conversation summaries) should continue using non-streaming `create()`.

## What to Do

### 1. Add streaming opt-out to AnthropicProvider

Add a `streaming` option to the `AnthropicProvider` constructor (defaulting to `true`). This is the simplest approach since `LLMService` creates the provider in its constructor.

```typescript
constructor(model: ClaudeModelId, options?: { streaming?: boolean }) {
  this.model = model;
  this.streaming = options?.streaming ?? true;
}
```

### 2. Swap to streaming in sendMessage (when streaming=true)

Replace:
```typescript
const response = await this.client.messages.create({...}, { signal });
```

With (when `this.streaming` is true):
```typescript
const stream = this.client.messages.stream({...});
// Wire abort signal
const onAbort = () => stream.abort();
signal?.addEventListener("abort", onAbort);
try {
  const message = await stream.finalMessage();
  return this.convertResponse(message);
} finally {
  signal?.removeEventListener("abort", onAbort);
}
```

When `this.streaming` is false, keep the existing `create()` call.

### 3. Abort signal plumbing

`messages.stream()` does NOT accept an `AbortSignal` in `RequestOptions`. Instead, cancellation uses `stream.abort()` on the `MessageStream` object. Bridge the existing `AbortSignal` to `stream.abort()` using `addEventListener("abort", ...)` and clean up in a `finally` block.

### 4. Retry logic

The existing retry loop wraps the API call. With streaming, wrap the `stream` creation + `await stream.finalMessage()` together inside the retry loop. If the stream fails mid-generation, `finalMessage()` rejects the promise, caught by the existing `catch`. The `classifyError()` method already handles all error types correctly.

### 5. Update micro-agent callers

In `LLMService.ts`, pass `{ streaming: false }` to `AnthropicProvider` when the LLMService is being used for micro-agent calls. The cleanest approach: since `LLMService` creates the provider internally, and micro-agent callers already create their own `LLMService` instances, pass the streaming option through `LLMService` or have `LLMService` detect "no tools registered" = micro-agent. However, the **simplest approach** per the feature doc is: let `LLMService` pass through a streaming option.

Consider adding an optional `streaming` field to `SmartHoleSettings` usage, or adding a constructor option to `LLMService`. The key is:
- Primary agent path (MessageProcessor line 352): streaming = true
- Commit message generation (MessageProcessor line 634): streaming = false  
- Retrospection (RetrospectionService line 30): streaming = false
- Conversation summaries (ConversationManager line 226): streaming = false
- Settings description generation (settings.ts line 264): streaming = false

The simplest approach: add an optional `streaming` boolean to the `LLMService` constructor that gets forwarded to `AnthropicProvider`. Default to `true`. Micro-agent callers pass `false` explicitly (or add a separate factory/option).

## Files to Modify

- `src/llm/AnthropicProvider.ts` — Add streaming constructor option, implement streaming path with abort bridging, keep `create()` fallback
- `src/llm/LLMService.ts` — Forward streaming option to AnthropicProvider constructor
- `src/processor/MessageProcessor.ts` — Pass `streaming: false` for commit message LLMService
- `src/retrospection/RetrospectionService.ts` — Pass `streaming: false`
- `src/context/ConversationManager.ts` — Pass `streaming: false` for summary generation
- `src/settings.ts` — Pass `streaming: false` for description generation

## Acceptance Criteria

1. Primary agent `sendMessage()` uses `messages.stream()` + `finalMessage()`
2. Abort signal works: `LLMService.abort()` during streaming cleanly cancels and returns benign response
3. Retry logic wraps stream creation + finalMessage together
4. Micro-agent calls (commit, retrospection, summaries, settings) use non-streaming `create()`
5. `convertResponse()` unchanged — `finalMessage()` returns the same `Anthropic.Message` type
6. No changes to `LLMProvider` interface, `LLMService` tool loop, `MessageProcessor`, or `ChatView` behavior
7. `mise run quality` passes