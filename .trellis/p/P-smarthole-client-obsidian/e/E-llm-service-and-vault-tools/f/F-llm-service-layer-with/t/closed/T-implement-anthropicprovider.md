---
id: T-implement-anthropicprovider
title: Implement AnthropicProvider for Claude API integration
status: done
priority: high
parent: F-llm-service-layer-with
prerequisites:
  - T-define-llm-abstraction-types
affectedFiles:
  src/llm/AnthropicProvider.ts: Created AnthropicProvider class implementing
    LLMProvider interface with Anthropic SDK integration, message/tool type
    conversion, retry logic with exponential backoff, and comprehensive error
    handling
  src/llm/index.ts: Added export for AnthropicProvider class
log:
  - >-
    Implemented AnthropicProvider class that implements the LLMProvider
    interface for Claude API integration. The provider:


    1. Accepts a ClaudeModelId in the constructor to support all three Claude
    4.5 models (Haiku, Sonnet, Opus)

    2. Uses initialize() to accept API key and create the Anthropic client

    3. Implements sendMessage() with full retry logic (3 attempts) and
    exponential backoff (1s, 2s, 4s)

    4. Properly converts between LLM abstraction types and Anthropic SDK types
    for messages, tools, and responses

    5. Classifies errors appropriately: auth (401) and bad request (400) fail
    immediately; rate limits (429), server errors (5xx), and network errors are
    retryable

    6. Provides clear user-friendly error messages for common failure cases

    7. Uses 4096 max tokens as default

    8. Handles Anthropic SDK's thinking/redacted_thinking blocks by filtering
    them from responses
schema: v1.0
childrenIds: []
created: 2026-02-03T06:23:07.525Z
updated: 2026-02-03T06:23:07.525Z
---

# Implement AnthropicProvider for Claude API Integration

## Purpose

Create the Anthropic-specific implementation of the `LLMProvider` interface that connects to Claude's API, handles authentication, tool calling, and implements retry logic for transient failures.

## Implementation Details

Create `src/llm/AnthropicProvider.ts`:

### Class Structure
```typescript
import Anthropic from '@anthropic-ai/sdk';
import type { LLMProvider, LLMMessage, LLMResponse, Tool, LLMError } from './types';
import type { ClaudeModelId } from '../types';

export class AnthropicProvider implements LLMProvider {
  private client: Anthropic | null = null;
  private model: ClaudeModelId;

  constructor(model: ClaudeModelId) {
    this.model = model;
  }

  async initialize(apiKey: string): Promise<void> {
    // Create Anthropic client with provided API key
  }

  async sendMessage(
    messages: LLMMessage[],
    tools?: Tool[],
    systemPrompt?: string
  ): Promise<LLMResponse> {
    // Implementation with retry logic
  }
}
```

### Key Implementation Points

1. **API Key Handling**
   - Accept API key via `initialize()` method (caller retrieves from Obsidian secrets)
   - Validate API key format before creating client
   - Throw `LLMError` with `code: 'auth_error'` for invalid/missing key

2. **Message Conversion**
   - Convert `LLMMessage[]` to Anthropic's message format
   - Handle both text content and tool use/result content blocks
   - Map content block types appropriately

3. **Tool Definition Conversion**
   - Convert `Tool[]` to Anthropic's tool format
   - Tool input_schema maps directly to Anthropic's expected format

4. **Retry Logic**
   - Implement 3 retry attempts for retryable errors
   - Retryable: network errors, rate limits (429), server errors (5xx)
   - Non-retryable: auth errors (401), bad request (400)
   - Use exponential backoff: 1s, 2s, 4s

5. **Error Handling**
   - Catch Anthropic SDK errors and wrap in `LLMError`
   - Provide clear user-friendly messages:
     - Auth error: "Invalid API key. Please check your Anthropic API key in settings."
     - Rate limit: "Rate limited by Anthropic. Please wait and try again."
     - Network: "Network error connecting to Anthropic. Check your connection."

6. **Response Mapping**
   - Map Anthropic response to `LLMResponse`
   - Extract stop_reason, content blocks, and usage statistics

## Files to Create

- `src/llm/AnthropicProvider.ts`

## Files to Modify

- `src/llm/index.ts` - Export `AnthropicProvider`

## Acceptance Criteria

- [ ] `AnthropicProvider` class implements `LLMProvider` interface
- [ ] `initialize()` method accepts API key and creates Anthropic client
- [ ] All three Claude 4.5 models work correctly (Haiku, Sonnet, Opus)
- [ ] Invalid API key produces clear error message
- [ ] Tool definitions passed in correct Anthropic format
- [ ] Retry logic attempts 3 times for transient failures
- [ ] Non-retryable errors fail immediately with clear message
- [ ] Response correctly mapped to `LLMResponse` type

## Technical Notes

- Use `@anthropic-ai/sdk` v0.39.0 (already installed)
- Model IDs from `ClaudeModelId` type in `src/types.ts`
- Max tokens: use 4096 as reasonable default
- Anthropic SDK handles streaming internally; use non-streaming for simplicity