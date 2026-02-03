---
id: T-define-llm-abstraction-types
title: Define LLM abstraction types and interfaces
status: done
priority: high
parent: F-llm-service-layer-with
prerequisites: []
affectedFiles:
  src/llm/types.ts: Created LLM abstraction types including LLMProvider interface,
    LLMMessage, ContentBlock variants, Tool/ToolCall/ToolResult types,
    LLMResponse, LLMError class with error codes, and type guards/utilities
  src/llm/index.ts: Created public exports module for LLM types, error class, type
    guards, and utility functions
log:
  - >-
    Started implementation. Research completed:

    - Reviewed existing codebase patterns in src/types.ts and
    src/websocket/types.ts

    - Examined Anthropic SDK types (@anthropic-ai/sdk v0.39.0)

    - Confirmed tsconfig.json with ES2018 target and strict mode

    - Verified src/llm directory needs to be created


    Key patterns observed:

    - Types use JSDoc-style comments with clear descriptions

    - Type guards used for discriminated unions

    - Index files export types separately with organized sections

    - ContentBlock and MessageParam types from SDK align with task requirements


    Will create:

    - src/llm/types.ts - All type definitions

    - src/llm/index.ts - Public exports
  - >-
    Implemented foundational LLM abstraction types for provider-agnostic LLM
    integration.


    Created comprehensive type definitions including:

    - LLMProvider interface with sendMessage() method accepting messages,
    optional tools, and system prompt

    - LLMMessage type supporting both simple strings and ContentBlock arrays for
    tool interactions

    - ContentBlock discriminated union (TextContentBlock, ToolUseContentBlock,
    ToolResultContentBlock)

    - Tool interface with name, description, and inputSchema (JSON Schema
    format)

    - ToolCall and ToolResult types for function calling workflow

    - LLMResponse type with content blocks, stopReason, and optional usage
    statistics

    - LLMError class with error codes (auth_error, rate_limit, network,
    invalid_request, unknown) and retryable flag

    - Static factory methods on LLMError for common error patterns

    - Type guards (isTextContentBlock, isToolUseContentBlock,
    isToolResultContentBlock)

    - Utility functions (extractToolCalls, extractTextContent) for working with
    responses


    All types are provider-agnostic while aligning with Claude's message format
    for easy mapping in the AnthropicProvider implementation.
schema: v1.0
childrenIds: []
created: 2026-02-03T06:22:50.618Z
updated: 2026-02-03T06:22:50.618Z
---

# Define LLM Abstraction Types and Interfaces

## Purpose

Create the foundational type definitions that establish the contract for LLM providers and tool calling. These types will be used by the AnthropicProvider and LLMService.

## Implementation Details

Create `src/llm/types.ts` with the following:

### LLM Provider Interface
```typescript
export interface LLMProvider {
  sendMessage(
    messages: LLMMessage[],
    tools?: Tool[],
    systemPrompt?: string
  ): Promise<LLMResponse>;
}
```

### Message Types
```typescript
export type MessageRole = 'user' | 'assistant';

export interface LLMMessage {
  role: MessageRole;
  content: string | ContentBlock[];
}

export interface ContentBlock {
  type: 'text' | 'tool_use' | 'tool_result';
  // Additional fields based on type
}
```

### Response Types
```typescript
export interface LLMResponse {
  content: ContentBlock[];
  stopReason: 'end_turn' | 'tool_use' | 'max_tokens';
  usage?: { inputTokens: number; outputTokens: number };
}
```

### Tool Types
```typescript
export interface Tool {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
}

export interface ToolCall {
  id: string;
  name: string;
  input: Record<string, unknown>;
}

export interface ToolResult {
  toolUseId: string;
  content: string;
  isError?: boolean;
}
```

### Error Types
```typescript
export class LLMError extends Error {
  constructor(
    message: string,
    public readonly code: 'auth_error' | 'rate_limit' | 'network' | 'unknown',
    public readonly retryable: boolean
  ) {
    super(message);
    this.name = 'LLMError';
  }
}
```

Also create `src/llm/index.ts` to export public types.

## Files to Create

- `src/llm/types.ts` - All type definitions
- `src/llm/index.ts` - Public exports

## Acceptance Criteria

- [ ] `LLMProvider` interface defined with `sendMessage` method
- [ ] `LLMMessage` type supports both text and content blocks
- [ ] `Tool`, `ToolCall`, and `ToolResult` types defined for function calling
- [ ] `LLMResponse` type includes content, stop reason, and usage
- [ ] `LLMError` class distinguishes retryable vs non-retryable errors
- [ ] All types exported from `src/llm/index.ts`

## Technical Notes

- Use TypeScript strict mode conventions
- Types should be provider-agnostic (not Anthropic-specific)
- Content block types should align with Claude's message format for easier mapping