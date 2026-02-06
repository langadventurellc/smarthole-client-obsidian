---
id: T-disable-parallel-tool-use-to
title: Disable parallel tool use to prevent batched tool calls from being dropped
status: done
priority: high
parent: none
prerequisites:
  - T-increase-default-max-tokens
affectedFiles:
  src/llm/AnthropicProvider.ts: "Added tool_choice with disable_parallel_tool_use:
    true to the messages.create() spread when tools are provided, forcing
    sequential one-tool-at-a-time responses"
log:
  - 'Added `tool_choice: { type: "auto" as const, disable_parallel_tool_use:
    true }` to the `messages.create()` call in `AnthropicProvider.ts` when tools
    are provided. This forces the model to emit one tool call at a time,
    preventing batched tool calls from being truncated by max_tokens limits and
    preventing the "forgetfulness" pattern where the model skips remaining
    operations after a large multi-tool response. Quality checks and build both
    pass.'
schema: v1.0
childrenIds: []
created: 2026-02-06T03:27:58.789Z
updated: 2026-02-06T03:27:58.789Z
---

## Problem

When the LLM tries to split a file into multiple new files and delete the original, it batches all tool calls (e.g., 3x `write_file` + `delete_file`) into a single response. This causes two failure modes:

1. **Truncation**: The combined response exceeds `max_tokens`, truncating the last tool calls (typically `delete_file`). The tool loop exits silently.
2. **Forgetfulness**: Even when the response fits, the model emits the `write_file` calls in one turn, then in the follow-up turn says "done!" without ever calling `delete_file`. After generating a very large multi-tool response, the model tends to summarize rather than continue with remaining operations.

This is a consistent, reproducible bug: asking the agent to split a file into multiple files and delete the original reliably results in the writes succeeding but the delete never happening. The logs confirm the pattern — `tools used: [get_active_note, read_file, write_file]` with no `delete_file`.

## Solution

In `src/llm/AnthropicProvider.ts`, add `tool_choice: { type: "auto", disable_parallel_tool_use: true }` to the `messages.create()` call when tools are provided. This forces the model to emit **one tool call at a time**, which:

1. Keeps each response small (never hits token limits)
2. Forces the model to iterate through each operation sequentially (write→write→write→delete) across separate loop iterations
3. Prevents the "forgetfulness" pattern because the model must explicitly decide to stop after each tool result

### Implementation

In `src/llm/AnthropicProvider.ts`, modify the `messages.create()` call (lines 86-95) to include `tool_choice` when tools are provided:

```typescript
const response = await this.client.messages.create(
  {
    model: this.model,
    max_tokens: DEFAULT_MAX_TOKENS,
    messages: anthropicMessages,
    ...(anthropicTools && anthropicTools.length > 0 && {
      tools: anthropicTools,
      tool_choice: { type: "auto" as const, disable_parallel_tool_use: true },
    }),
    ...(systemPrompt && { system: systemPrompt }),
  },
  { signal }
);
```

Note: `tool_choice` with `type: "auto"` preserves the default behavior where the model can choose whether to use tools or not — it just limits it to at most one tool per response when it does.

### Files to Modify

| File | Change |
|------|--------|
| `src/llm/AnthropicProvider.ts` | Add `tool_choice: { type: "auto", disable_parallel_tool_use: true }` to the `messages.create()` call when tools are provided (line 91) |

## Acceptance Criteria

- [ ] `messages.create()` includes `tool_choice: { type: "auto", disable_parallel_tool_use: true }` when tools are provided
- [ ] The model emits one tool call per response (verify via debug logs: each iteration should show exactly one tool)
- [ ] Multi-step operations (e.g., split file into 3 + delete original) complete all steps including the delete
- [ ] Quality checks pass: `mise run quality`
- [ ] Build succeeds: `mise run build`

## Tradeoffs

- **Increased latency**: Each tool call requires a separate API round trip instead of batching. For operations with many tool calls (e.g., editing 5 files), this means 5 round trips instead of potentially 1-2. This is acceptable because correctness is more important than speed for this use case.
- **More API calls**: More messages.create() calls per operation, but each is smaller. Total token usage may actually decrease since responses are shorter.

## Out of Scope

- Making `disable_parallel_tool_use` configurable via settings
- Adding continuation/retry logic for `max_tokens` truncation (the combination of higher max_tokens from `T-increase-default-max-tokens` + sequential tool use should eliminate this)
- Changes to the tool loop in `LLMService.ts`
- Changes to any tool implementations