---
id: F-llm-service-layer-with
title: LLM Service Layer with Anthropic Provider
status: in-progress
priority: high
parent: E-llm-service-and-vault-tools
prerequisites: []
affectedFiles:
  src/llm/types.ts: Created LLM abstraction types including LLMProvider interface,
    LLMMessage, ContentBlock variants, Tool/ToolCall/ToolResult types,
    LLMResponse, LLMError class with error codes, and type guards/utilities
  src/llm/index.ts: Created public exports module for LLM types, error class, type
    guards, and utility functions; Added export for AnthropicProvider class
  src/llm/AnthropicProvider.ts: Created AnthropicProvider class implementing
    LLMProvider interface with Anthropic SDK integration, message/tool type
    conversion, retry logic with exponential backoff, and comprehensive error
    handling
log: []
schema: v1.0
childrenIds:
  - T-implement-anthropicprovider
  - T-implement-llmservice-for-tool
  - T-define-llm-abstraction-types
created: 2026-02-03T06:20:01.944Z
updated: 2026-02-03T06:20:01.944Z
---

# LLM Service Layer with Anthropic Provider

## Purpose

Implement the LLM integration layer that connects to Anthropic's Claude API, handles tool calling, and orchestrates conversations with the vault tools. This is the core intelligence layer that interprets user commands and decides what actions to take.

## Requirements

### LLM Provider Abstraction
- Create abstract interfaces in `src/llm/types.ts` for:
  - `LLMProvider` interface with `sendMessage()` method
  - `LLMMessage` type for conversation messages (role, content)
  - `LLMResponse` type for provider responses
  - `Tool` interface for tool definitions
  - `ToolCall` and `ToolResult` types for function calling

### Anthropic Provider Implementation
- Create `src/llm/AnthropicProvider.ts` implementing `LLMProvider`
- Use `@anthropic-ai/sdk` (already in dependencies)
- Support all three Claude 4.5 models from settings
- Retrieve API key from Obsidian's secret storage
- Construct system prompt incorporating information architecture from settings
- Handle tool use (function calling) in Claude's format
- Implement retry logic (2-3 attempts) for transient failures
- Provide clear error messages for invalid API key

### Tool Orchestration
- Create `src/llm/LLMService.ts` as the main service class
- Register available vault tools
- Execute tool calls and return results to LLM
- Handle multi-turn conversations with tool use
- Provide conversation history for context

### System Prompt
The system prompt should:
- Include the information architecture from settings
- Describe available vault manipulation capabilities
- Guide the LLM to make best-guess decisions (no interactive clarification)
- Instruct to send notifications via SmartHole for user feedback

## Acceptance Criteria

- [ ] `LLMProvider` interface defined with clear contracts
- [ ] `AnthropicProvider` successfully calls Claude API with valid key
- [ ] Invalid API key produces clear, user-friendly error message
- [ ] All three Claude 4.5 models (Haiku, Sonnet, Opus) work correctly
- [ ] System prompt includes information architecture from settings
- [ ] Tool definitions passed to Claude in correct format
- [ ] Tool calls executed and results returned to Claude
- [ ] Multi-turn tool use conversations work correctly
- [ ] API failures trigger retry (2-3 attempts) before failing
- [ ] Conversation history maintained and provided for context

## Technical Notes

- API key retrieval: Use `this.app.loadSecret(settings.anthropicApiKeyName)`
- Model IDs: Use `ClaudeModelId` type from `src/types.ts`
- Tool format: Follow Claude's function calling specification
- Error handling: Distinguish between retryable (network) and non-retryable (auth) errors

## File Structure

```
src/llm/
├── types.ts              # Abstract interfaces and types
├── AnthropicProvider.ts  # Anthropic implementation
├── LLMService.ts         # Service orchestrating tools and conversations
└── index.ts              # Public exports
```

## Dependencies

None within this epic - this feature should be implemented first as the vault tools feature depends on the tool interface definitions.