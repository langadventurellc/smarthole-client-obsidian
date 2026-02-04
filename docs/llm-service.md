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
const tools = service.getRegisteredTools(); // ["read_file", "edit_file", "write_file", ...]
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
// May involve: search_files → read_file → generate summary
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

## Conversation State Management

The service tracks conversation state for multi-turn interactions where the agent may ask questions and wait for user responses:

```typescript
// Check if agent is waiting for user response
const isWaiting = service.isWaitingForUserResponse();

// Get current state for persistence
const state = service.getConversationState();
// Returns: { isWaitingForResponse: boolean, pendingContext?: PendingContext }

// Restore state from persistence (e.g., after restart)
service.restoreConversationState(persistedState);

// Signal waiting state (called by send_message tool when is_question=true)
service.setWaitingForResponse(questionMessage, messageId);

// Clear waiting state when conversation continues or completes
service.clearWaitingState();
```

### State Types

```typescript
interface ConversationState {
  isWaitingForResponse: boolean;
  pendingContext?: PendingContext;
}

interface PendingContext {
  originalMessageId: string;   // Message that initiated the pending state
  toolCallsCompleted: number;  // Tool calls completed before asking
  lastAgentMessage: string;    // The question sent to user
  createdAt: string;           // ISO 8601 timestamp
}
```

The state is automatically updated when:
- The `send_message` tool is called with `is_question=true`
- Tool calls are executed (increments `toolCallsInSession`)
- The conversation is cleared via `clearWaitingState()`

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

## Communication Tools

Beyond vault manipulation tools, the service supports communication tools:

### send_message

Allows the agent to send messages to users during task execution:

```typescript
import { createSendMessageTool, SendMessageContext } from "./llm/tools";

const context: SendMessageContext = {
  sendToSmartHole: (msg, priority) => connection.sendNotification(msg, priority),
  sendToChatView: (msg, isQuestion) => notifyCallback({ content: msg, isQuestion }),
  source: "websocket" | "direct",
};

const tool = createSendMessageTool(context);
service.registerTool(tool);
```

Tool input:
```typescript
{
  message: string,      // Message content (required)
  is_question?: boolean // Whether waiting for user response
}
```

When `is_question=true`, the tool signals to LLMService that the agent is waiting for a user response, enabling conversation state tracking and persistence.

### end_conversation

Allows the agent to explicitly end the current conversation, triggering summary generation and starting fresh context. See [Conversation History](conversation-history.md) for detailed documentation.

```typescript
import { createEndConversationTool, EndConversationContext } from "./llm/tools";

const context: EndConversationContext = {
  conversationManager,
  getLLMService: () => llmService,
};

const tool = createEndConversationTool(context);
service.registerTool(tool);
```

Tool input:
```typescript
{
  reason?: string  // Optional reason for ending (e.g., "task completed")
}
```

### get_conversation

Allows the agent to retrieve past conversation details when context from previous conversations is needed. Since past conversations are no longer included in the system prompt, the agent uses this tool to access them on demand. See [Conversation History](conversation-history.md) for detailed documentation.

```typescript
import { createGetConversationTool, GetConversationContext } from "./llm/tools";

const context: GetConversationContext = {
  conversationManager,
};

const tool = createGetConversationTool(context);
service.registerTool(tool);
```

Tool input:
```typescript
{
  conversation_id?: string,  // Specific conversation to retrieve (full history)
  list_recent?: number       // List N most recent conversations (summaries only, default: 10)
}
```

When `conversation_id` is provided, returns the full conversation with all messages. When `list_recent` is provided (or neither parameter), returns summaries of recent conversations. Only completed conversations are accessible (not the current active one).

## Implementation

Located in `src/llm/`:
- `types.ts` - Provider-agnostic type definitions
- `LLMService.ts` - Main orchestration service
- `AnthropicProvider.ts` - Claude API integration
- `tools/` - Vault manipulation, communication, and conversation tools
- `index.ts` - Public exports
