# LLM Service

Provider-agnostic LLM integration layer with tool registration, conversation management, and multi-turn processing.

## Initialization

```typescript
import { LLMService, AnthropicProvider } from "./llm";

const provider = new AnthropicProvider(apiKey, "claude-haiku-4-5-20251001");
const service = new LLMService(provider);

// Register tools
service.registerTool({
  name: "example_tool",
  description: "Does something useful",
  input_schema: { type: "object", properties: {}, required: [] },
  execute: async (input) => ({ success: true }),
});

// Set system context
service.setSystemPrompt("You are a helpful assistant.");
service.setConversationContext("Previous conversation summary...");
```

## Architecture

```
┌─────────────────┐
│   LLMService    │ ← Tool registration, conversation loop
├─────────────────┤
│ LLMProvider     │ ← Abstract interface
├─────────────────┤
│AnthropicProvider│ ← Concrete implementation
└─────────────────┘
```

## Provider Interface

```typescript
interface LLMProvider {
  chat(
    messages: LLMMessage[],
    tools: Tool[],
    systemPrompt: string
  ): Promise<LLMResponse>;
}

interface LLMResponse {
  content: ContentBlock[];
  stopReason: "end_turn" | "tool_use" | "max_tokens";
}
```

## Tool Registration

```typescript
interface ToolHandler {
  tool: Tool;
  execute: (input: Record<string, unknown>) => Promise<unknown>;
}

// Register individual tool
service.registerTool(toolHandler);

// Get registered tool names
const tools = service.getRegisteredTools(); // ["create_note", "search_notes", ...]
```

## Processing Messages

```typescript
const result = await service.processMessage("Create a note about today's meeting");

// Result contains full response with all content blocks
result.content.forEach((block) => {
  if (block.type === "text") {
    console.log("Response:", block.text);
  } else if (block.type === "tool_use") {
    console.log("Tool called:", block.name);
  }
});
```

## Multi-Turn Tool Loop

The service automatically handles multi-turn conversations when tools are invoked:

1. Send user message to LLM
2. If LLM returns `tool_use`, execute the tool
3. Send tool result back to LLM
4. Repeat until `stop_reason: "end_turn"` or max iterations (10)

```typescript
// Automatic tool execution loop
const result = await service.processMessage("Search for notes about project X and summarize");
// May involve: search_notes → read results → generate summary
```

## Conversation History

The service maintains conversation history for context:

```typescript
// Set external conversation context (summaries, history)
service.setConversationContext(historyPrompt);

// Clear current conversation
service.clearConversation();

// History is automatically managed:
// - User messages added on processMessage()
// - Assistant responses added after LLM response
// - Tool calls and results included in history
// - Max 20 messages retained in working memory
```

## Error Handling

```typescript
interface LLMError {
  code: "auth_error" | "rate_limit" | "network_error" | "invalid_request" | "unknown";
  message: string;
  retryable: boolean;
}
```

| Error Code | Retryable | Cause |
|------------|-----------|-------|
| `auth_error` | No | Invalid or missing API key |
| `rate_limit` | Yes | Too many requests |
| `network_error` | Yes | Connection failed |
| `invalid_request` | No | Malformed request or content too long |
| `unknown` | No | Unexpected error |

## Anthropic Provider

Concrete implementation for Claude models:

```typescript
const provider = new AnthropicProvider(
  apiKey,          // Anthropic API key
  modelId          // e.g., "claude-haiku-4-5-20251001"
);
```

### Retry Logic

- Maximum 3 attempts for retryable errors
- Exponential backoff: 1s → 2s → 4s
- Non-retryable errors fail immediately

### Supported Models

| Model | API ID | Use Case |
|-------|--------|----------|
| Claude Haiku 4.5 | `claude-haiku-4-5-20251001` | Fast, cost-efficient |
| Claude Sonnet 4.5 | `claude-sonnet-4-5-20250929` | Balanced |
| Claude Opus 4.5 | `claude-opus-4-5-20251101` | Maximum capability |

## Implementation

Located in `src/llm/`:
- `types.ts` - Provider-agnostic type definitions
- `LLMService.ts` - Main orchestration service
- `AnthropicProvider.ts` - Claude API integration
- `tools/` - Vault manipulation tools
- `index.ts` - Public exports
