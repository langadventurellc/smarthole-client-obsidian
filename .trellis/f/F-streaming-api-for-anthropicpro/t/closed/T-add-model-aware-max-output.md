---
id: T-add-model-aware-max-output
title: Add model-aware max output token mapping
status: done
priority: high
parent: F-streaming-api-for-anthropicpro
prerequisites: []
affectedFiles:
  src/types.ts: Added CLAUDE_MODEL_MAX_OUTPUT_TOKENS constant mapping each
    ClaudeModelId to its confirmed max output token limit (64000 for all three
    models)
  src/llm/AnthropicProvider.ts: Replaced DEFAULT_MAX_TOKENS usage with
    CLAUDE_MODEL_MAX_OUTPUT_TOKENS[this.model], removed the DEFAULT_MAX_TOKENS
    constant, updated import to include the new mapping
log:
  - >-
    Research complete. Confirmed from official Anthropic docs
    (platform.claude.com/docs/en/about-claude/models/overview):

    - claude-haiku-4-5-20251001: 64K tokens max output

    - claude-sonnet-4-5-20250929: 64K tokens max output

    - claude-opus-4-5-20251101: 64K tokens max output (listed as legacy,
    replaced by Opus 4.6)


    All three models support the same 64K output limit. The feature doc's
    approximate values (8192/16384/32000) are outdated. Proceeding with
    implementation using confirmed 64K values.
  - Replaced hardcoded DEFAULT_MAX_TOKENS = 16384 with a model-aware
    CLAUDE_MODEL_MAX_OUTPUT_TOKENS mapping. Confirmed from official Anthropic
    docs (platform.claude.com/docs/en/about-claude/models/overview) that all
    three Claude 4.5 models (Haiku, Sonnet, Opus) support 64K max output tokens.
    The mapping is defined in src/types.ts alongside CLAUDE_MODELS for
    consistency, and used in AnthropicProvider.sendMessage() via this.model
    lookup. The old DEFAULT_MAX_TOKENS constant has been removed.
schema: v1.0
childrenIds: []
created: 2026-02-06T04:27:41.735Z
updated: 2026-02-06T04:27:41.735Z
---

## Purpose

Replace the hardcoded `DEFAULT_MAX_TOKENS = 16384` in `AnthropicProvider.ts` with a model-to-max-output-tokens mapping, so each Claude model uses its actual maximum output token limit.

## What to Do

1. **Use Perplexity to confirm** the current max output token limits for each model:
   - `claude-haiku-4-5-20251001`
   - `claude-sonnet-4-5-20250929`
   - `claude-opus-4-5-20251101`
   
   The feature doc has approximate values (8192 / 16384 / 32000) but explicitly says to confirm from current Anthropic docs at implementation time.

2. **Create a const mapping** from `ClaudeModelId` to max output tokens. Place it either:
   - In `src/types.ts` alongside the `CLAUDE_MODELS` definition, OR
   - In `src/llm/AnthropicProvider.ts` as a module-level const
   
   Prefer `src/types.ts` since `CLAUDE_MODELS` is already there and this is model metadata.

3. **Use the mapping** in `AnthropicProvider.sendMessage()` instead of `DEFAULT_MAX_TOKENS`. The provider already has `this.model` available.

4. **Remove** the `DEFAULT_MAX_TOKENS` constant.

## Files to Modify

- `src/types.ts` — Add `CLAUDE_MODEL_MAX_OUTPUT_TOKENS` (or similar) mapping
- `src/llm/AnthropicProvider.ts` — Import and use the new mapping, remove `DEFAULT_MAX_TOKENS`

## Acceptance Criteria

- Each model gets its correct max output token limit (confirmed from Anthropic docs)
- No hardcoded `DEFAULT_MAX_TOKENS` remains
- `mise run quality` passes