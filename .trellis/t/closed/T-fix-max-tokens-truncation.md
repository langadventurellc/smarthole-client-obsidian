---
id: T-fix-max-tokens-truncation
title: Fix max_tokens truncation causing multi-tool operations to silently fail
status: done
priority: high
parent: none
prerequisites: []
affectedFiles:
  src/llm/AnthropicProvider.ts: Changed DEFAULT_MAX_TOKENS from 4096 to 16384
  src/llm/LLMService.ts: Added max_tokens truncation warning after the tool use loop
log:
  - Fixed max_tokens truncation causing multi-tool operations to silently fail.
    Increased DEFAULT_MAX_TOKENS from 4096 to 16384 in AnthropicProvider.ts to
    give Claude sufficient room for multi-tool responses with file content.
    Added a console.warn in LLMService.ts after the tool loop when
    response.stopReason === "max_tokens" as a safety net diagnostic.
schema: v1.0
childrenIds: []
created: 2026-02-06T02:49:08.168Z
updated: 2026-02-06T02:49:08.168Z
---

## Problem

When the LLM tries to return multiple `tool_use` blocks in a single response (e.g., two `write_file` calls with full file contents), the response exceeds the `DEFAULT_MAX_TOKENS` limit of 4096 and gets truncated with `stop_reason: "max_tokens"`. The tool loop in `LLMService.processMessage()` only continues when `stopReason === "tool_use"`, so it silently exits — no tools are executed for that turn.

This causes multi-tool operations (like splitting a note into two new files) to consistently fail: the agent reports success but nothing actually happens.

### Root Cause

**`src/llm/AnthropicProvider.ts:20`**: `DEFAULT_MAX_TOKENS = 4096`

**`src/llm/LLMService.ts:170`**: `while (response.stopReason === "tool_use" && ...)`

When Claude tries to emit two `write_file` tool calls (each containing full file content as JSON in the `input` parameter), the response easily exceeds 4096 output tokens. The API truncates the response with `stop_reason: "max_tokens"`. Since the while loop only continues for `"tool_use"`, it exits silently, treating the truncated response as the final answer.

## Solution

Two changes:

### 1. Increase `DEFAULT_MAX_TOKENS` (AnthropicProvider.ts:20)

Change `DEFAULT_MAX_TOKENS` from `4096` to `16384`. All current Claude models (Haiku, Sonnet, Opus) support at least 8192 output tokens, and newer models support significantly more. A higher limit doesn't force the model to generate more tokens — it just allows it to when needed (e.g., multi-tool responses with file content).

### 2. Handle `max_tokens` stop reason in the tool loop (LLMService.ts:170)

When `stopReason === "max_tokens"` and the response contains incomplete tool_use blocks, the current code silently drops the tools. Add handling for this case:

- After the while loop exits, check if `response.stopReason === "max_tokens"`
- If the truncated response contains any `tool_use` blocks, those blocks may have been truncated and should NOT be executed (the SDK may exclude malformed blocks, but any that survive could have truncated input data)
- Log a warning: `"LLM response truncated (max_tokens) — tool calls may have been dropped"`
- The increased `max_tokens` from change #1 should prevent this from occurring in practice, but the warning serves as a safety net for diagnosis

### Files to Modify

| File | Change |
|------|--------|
| `src/llm/AnthropicProvider.ts` | Change `DEFAULT_MAX_TOKENS` from `4096` to `16384` |
| `src/llm/LLMService.ts` | Add `max_tokens` warning after the tool loop (log only, not an error — the response is still returned) |

## Acceptance Criteria

- [ ] `DEFAULT_MAX_TOKENS` is increased to `16384`
- [ ] When `response.stopReason === "max_tokens"` after the tool loop, a console warning is logged
- [ ] Multi-tool operations (e.g., creating two files in one request) complete successfully
- [ ] Single-tool operations continue to work
- [ ] Quality checks pass: `mise run quality`
- [ ] Build succeeds: `mise run build`

## Out of Scope

- Disabling parallel tool use (`disable_parallel_tool_use`) — deferred as a potential follow-up
- Making `max_tokens` configurable via settings
- Retrying with a higher `max_tokens` on truncation (the 16384 increase should be sufficient)
- Adding verbose logging infrastructure (separate task)