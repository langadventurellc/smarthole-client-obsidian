---
id: T-increase-default-max-tokens
title: Increase DEFAULT_MAX_TOKENS to prevent truncation on large file operations
status: done
priority: high
parent: none
prerequisites: []
affectedFiles:
  src/llm/AnthropicProvider.ts: Changed DEFAULT_MAX_TOKENS constant from 16384 to 64000 on line 21
log:
  - Increased DEFAULT_MAX_TOKENS from 16384 to 64000 in AnthropicProvider.ts.
    All Claude models used by this project (Haiku 4.5, Sonnet 4.5, Opus 4.5)
    support up to 64,000 output tokens. This prevents response truncation on
    large file operations (e.g., splitting a 25KB note into multiple files)
    without any cost impact, since billing is based on actual tokens generated.
schema: v1.0
childrenIds: []
created: 2026-02-06T03:27:36.575Z
updated: 2026-02-06T03:27:36.575Z
---

## Problem

The current `DEFAULT_MAX_TOKENS` of 16384 in `src/llm/AnthropicProvider.ts` (line 21) can still cause response truncation when the LLM generates large responses containing file content — for example, when splitting a 25KB note into 3 new files. When truncation occurs (`stop_reason: "max_tokens"`), the tool loop in `LLMService.processMessage()` exits silently because it only continues when `stopReason === "tool_use"`. Any tool calls that were truncated (e.g., the final `delete_file`) are silently dropped.

Rough token math: 1 token ≈ 4 characters. A 25KB file ≈ 6,250 tokens. Writing 3 files with that content + JSON overhead + text explanations can exceed 16K tokens.

This was partially addressed in `T-fix-max-tokens-truncation` (increased from 4096 to 16384 and added a `console.warn`), but 16384 is still insufficient for larger documents.

## Solution

In `src/llm/AnthropicProvider.ts`, increase `DEFAULT_MAX_TOKENS` from `16384` to `64000`.

All current Claude models used by this project (Haiku 4.5, Sonnet 4.5, Opus 4.5) support up to 64,000 output tokens. Setting a higher `max_tokens` does not force the model to generate more tokens — it only allows it to when needed. There is no cost impact from a higher limit; billing is based on actual tokens generated.

### Files to Modify

| File | Change |
|------|--------|
| `src/llm/AnthropicProvider.ts` | Change `DEFAULT_MAX_TOKENS` from `16384` to `64000` (line 21) |

## Acceptance Criteria

- [ ] `DEFAULT_MAX_TOKENS` is set to `64000` in `src/llm/AnthropicProvider.ts`
- [ ] No other code changes needed — the constant is only referenced on line 89
- [ ] Quality checks pass: `mise run quality`
- [ ] Build succeeds: `mise run build`

## Out of Scope

- Making `max_tokens` configurable via plugin settings
- Adding retry/continuation logic for `max_tokens` truncation (handled by the companion task to disable parallel tool use)
- Changing the `console.warn` diagnostic added in `T-fix-max-tokens-truncation`