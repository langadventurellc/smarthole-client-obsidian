# Message Processor

Orchestrates the complete message processing pipeline from inbox persistence through LLM processing to notification delivery.

## Initialization

```typescript
import { MessageProcessor } from "./processor";

const processor = new MessageProcessor({
  inbox: inboxManager,
  connection: smartHoleConnection,
  createLLMService: () => new LLMService(provider),
  app: obsidianApp,
  settings: pluginSettings,
  conversationManager: conversationManager,
});
```

## Pipeline Flow

```
┌─────────────┐   ┌─────────────┐   ┌─────────────┐
│ Save Inbox  │ → │ Send Ack    │ → │ LLM Process │
└─────────────┘   └─────────────┘   └─────────────┘
                                            ↓
┌─────────────┐   ┌─────────────┐   ┌─────────────┐
│ Cleanup     │ ← │ Record Hist │ ← │ Send Notify │
└─────────────┘   └─────────────┘   └─────────────┘
```

1. **Save to inbox** - Message persisted for durability before any processing
2. **Send acknowledgment** - Notify SmartHole that message was received
3. **LLM processing** - Create LLMService, register tools, process with retry
4. **Send notification** - Success or error notification via SmartHole
5. **Record history** - Add messages to active conversation via ConversationManager
6. **Cleanup** - Remove message from inbox on success

## Usage

### Processing Messages

```typescript
// Process incoming message
const result = await processor.process(routedMessage);

if (result.success) {
  console.log("Response:", result.response);
  console.log("Tools used:", result.toolsUsed);
} else {
  console.log("Failed:", result.error);
}
```

### Startup Recovery

```typescript
// Reprocess any messages that failed during previous session
await processor.reprocessPending();
```

### Response Callbacks

```typescript
// Subscribe to LLM responses
processor.onResponse((messageId, response, toolsUsed) => {
  // Update UI, log, etc.
});

// Subscribe to incoming messages (before processing)
processor.onMessageReceived((message) => {
  // Display in chat UI
});

// Subscribe to mid-execution agent messages (from send_message tool)
processor.onAgentMessage((message) => {
  // Display real-time updates from agent
  console.log(message.content, message.isQuestion);
});
```

## Process Result

```typescript
interface ProcessResult {
  success: boolean;
  messageId: string;
  response?: string;      // LLM's text response
  toolsUsed?: string[];   // Tools invoked during processing
  error?: string;         // Error message if failed
}
```

## Retry Logic

| Attempt | Delay | Condition |
|---------|-------|-----------|
| 1 | 0s | Initial attempt |
| 2 | 1s | Retryable error |
| 3 | 2s | Retryable error |
| 4 | 4s | Retryable error (final) |

### Retryable Errors

- Rate limits (`rate_limit`)
- Network issues (`network_error`)

### Non-Retryable Errors

- Authentication failures (`auth_error`)
- Invalid requests (`invalid_request`)

## Error Messages

User-friendly messages mapped from LLM error codes:

| Code | User Message |
|------|--------------|
| `auth_error` | "API key is missing or invalid" |
| `rate_limit` | "Too many requests. Please try again in a moment." |
| `network_error` | "Network error. Please check your internet connection." |
| `invalid_request` | "Unable to process request. The message may be too long." |

## Message Sources

The processor handles messages from different sources:

```typescript
interface RoutedMessage {
  id: string;
  text: string;
  timestamp: string;
  source?: "websocket" | "direct";  // Origin of message
  metadata?: Record<string, unknown>;
}
```

- `websocket` - Messages routed through SmartHole
- `direct` - Messages typed directly in ChatView sidebar

## Inbox Persistence

Messages are saved to `.smarthole/inbox/` before processing:

- Ensures no message loss on crash or restart
- Failed messages remain in inbox for retry
- Successful messages cleaned up after processing
- `reprocessPending()` handles recovery on plugin load

## Agent Communication (send_message Tool)

The processor integrates the `send_message` tool, allowing the agent to communicate with users during task execution:

```typescript
// Tool is automatically registered during processWithRetry()
// Uses SendMessageContext to route messages to appropriate channels

interface SendMessageContext {
  sendToSmartHole: (message: string, priority?: "normal" | "high") => void;
  sendToChatView: (message: string, isQuestion: boolean) => void;
  source: "websocket" | "direct";
}
```

- Messages always appear in ChatView (regardless of source)
- WebSocket messages also send SmartHole notifications
- Questions use high priority for SmartHole notifications
- Supports `is_question` flag for conversational workflows

## Conversation Management

The processor integrates with `ConversationManager` for conversation lifecycle:

- Messages are recorded to the active conversation via `addMessage()`
- Conversation boundaries are detected automatically via idle timeout
- The `end_conversation` tool is registered to allow explicit conversation ending
- See [Conversation History](conversation-history.md) for detailed documentation

## Configuration

```typescript
interface MessageProcessorConfig {
  inbox: InboxManager;
  connection: SmartHoleConnection;
  createLLMService: () => LLMService;
  app: App;
  settings: SmartHoleSettings;
  conversationManager: ConversationManager;
}
```

## Implementation

Located in `src/processor/`:
- `types.ts` - Configuration and result interfaces (includes `AgentMessageCallback`)
- `MessageProcessor.ts` - Main orchestration class
- `index.ts` - Public exports
