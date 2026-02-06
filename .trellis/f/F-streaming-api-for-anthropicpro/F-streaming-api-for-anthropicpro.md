---
id: F-streaming-api-for-anthropicpro
title: Streaming API for AnthropicProvider
status: in-progress
priority: high
parent: none
prerequisites: []
affectedFiles:
  src/types.ts: Added CLAUDE_MODEL_MAX_OUTPUT_TOKENS constant mapping each
    ClaudeModelId to its confirmed max output token limit (64000 for all three
    models)
  src/llm/AnthropicProvider.ts: Replaced DEFAULT_MAX_TOKENS usage with
    CLAUDE_MODEL_MAX_OUTPUT_TOKENS[this.model], removed the DEFAULT_MAX_TOKENS
    constant, updated import to include the new mapping
log: []
schema: v1.0
childrenIds:
  - T-add-model-aware-max-output
  - T-migrate-sendmessage-to
created: 2026-02-06T04:26:28.413Z
updated: 2026-02-06T04:26:28.413Z
---

## Purpose

Migrate the primary LLM agent path in `AnthropicProvider` from synchronous `client.messages.create()` to streaming `client.messages.stream()` + `stream.finalMessage()`. This eliminates the max_tokens ceiling (currently hardcoded at 16,384) and removes HTTP timeout restrictions that limit the agent's ability to handle complex, multi-step operations or work with larger documents.

The streaming approach uses `finalMessage()` to return the exact same `Anthropic.Message` shape as `create()`, so this is a transparent swap — all downstream consumers (`LLMService`, `MessageProcessor`, `ChatView`) remain unchanged. Real-time text streaming to the UI is explicitly out of scope (Phase 2).

## Key Components to Implement

### 1. Swap `create()` for `stream()` + `finalMessage()` in `AnthropicProvider.sendMessage()`

Replace the current synchronous API call:
```typescript
const response = await this.client.messages.create({...}, { signal });
```

With streaming:
```typescript
const stream = this.client.messages.stream({...});
// Wire abort signal to stream
const onAbort = () => stream.abort();
signal?.addEventListener("abort", onAbort);
try {
  const message = await stream.finalMessage();
  return this.convertResponse(message);
} finally {
  signal?.removeEventListener("abort", onAbort);
}
```

The `convertResponse()` method remains unchanged — `finalMessage()` returns the same `Anthropic.Message` type.

### 2. Model-aware max_tokens

Replace the hardcoded `DEFAULT_MAX_TOKENS = 16384` with model-appropriate maximums:
- **Haiku 4.5** (`claude-haiku-4-5-20251001`): 8,192 output tokens max
- **Sonnet 4.5** (`claude-sonnet-4-5-20250929`): 16,384 output tokens max
- **Opus 4.5** (`claude-opus-4-5-20251101`): 32,000 output tokens max

Use Perplexity or Anthropic docs to confirm the actual max output token limits for each model at implementation time — the values above are approximate and may have changed. Create a mapping from `ClaudeModelId` to max output tokens, either as a const map in `AnthropicProvider` or alongside the `CLAUDE_MODELS` definition in `types.ts`.

### 3. Abort signal plumbing

`messages.stream()` does NOT accept an `AbortSignal` in `RequestOptions` the way `create()` does. Instead, cancellation uses `stream.abort()` on the `MessageStream` object. Bridge the existing `AbortSignal` to `stream.abort()` using `addEventListener("abort", ...)` and clean up with `removeEventListener` in a `finally` block to prevent leaks.

### 4. Retry logic

The existing retry loop (3 attempts, exponential backoff) wraps the entire API call. With streaming, wrap the `stream` creation + `await stream.finalMessage()` together inside the retry loop. If the stream fails mid-generation, `finalMessage()` rejects the promise, which gets caught by the existing `catch` block. The `classifyError()` method already handles `APIUserAbortError` (checked before generic `APIError` due to inheritance) and all other Anthropic error types — no changes needed there.

### 5. Scope boundaries — what NOT to change

- **`LLMProvider` interface** — `sendMessage()` return type stays `Promise<LLMResponse>`, no signature change
- **`LLMService`** — Tool loop, conversation history, abort logic all unchanged
- **`MessageProcessor`** — Consumes `LLMResponse`, no change
- **`ChatView`** — Continues showing typing indicator then full response
- **All tool definitions** — Schemas, execution, results unchanged
- **Micro-agent calls** (commit message generation, retrospection, etc.) — These use separate `LLMService` instances and should continue using `messages.create()`. The simplest approach: add a `streaming` option (defaulting to `true`) to `AnthropicProvider` or `sendMessage()`, so callers that want synchronous behavior can opt out. Alternatively, keep `create()` as a separate code path for when streaming isn't needed.

## Acceptance Criteria

1. `AnthropicProvider.sendMessage()` uses `messages.stream()` + `finalMessage()` for the primary agent path
2. `max_tokens` is set to each model's maximum output token limit (confirmed from current Anthropic docs)
3. Abort/cancellation works: calling `LLMService.abort()` during a streaming request cleanly cancels the stream and returns a benign response
4. Retry logic handles mid-stream failures (e.g., network drop during generation) by retrying from scratch
5. All existing behavior preserved: tool use loop, conversation history, error classification, typing indicator in ChatView
6. Micro-agent calls (commit messages, retrospection) continue using non-streaming `create()` — they are not affected by this change
7. `mise run quality` passes (lint + format + type-check)
8. Manual verification: send a message via ChatView and via WebSocket, confirm the agent responds correctly with tool use working as before

## Technical Requirements

- **SDK**: `@anthropic-ai/sdk@^0.39.0` (already installed, supports `messages.stream()`)
- **No new dependencies**
- **Files modified**: Primarily `src/llm/AnthropicProvider.ts`, possibly `src/types.ts` for max token mapping

## Implementation Guidance

- Start by reading the current `AnthropicProvider.sendMessage()` method carefully
- Use Perplexity to confirm current max output token limits for each Claude model
- The `MessageStream` type from the SDK provides `.abort()`, `.finalMessage()`, `.on('text', ...)` etc.
- `finalMessage()` returns `Promise<Anthropic.Message>` — identical to what `create()` returns
- For the micro-agent opt-out, prefer simplicity: a constructor option or a second method is cleaner than a parameter on every call
- Test abort by clicking the stop button in ChatView mid-response

## Testing Requirements

- No automated tests in this project — validation is via `mise run quality` and manual testing
- Manual test plan:
  1. Send a direct message via ChatView → verify response arrives, tool use works
  2. Send a message via WebSocket → verify same behavior
  3. Click stop button mid-response → verify clean cancellation (no errors, no hanging state)
  4. Trigger a rate limit or network error → verify retry logic works (can simulate by temporarily using invalid API key for auth error)
  5. Verify commit message auto-generation still works (uses non-streaming path)