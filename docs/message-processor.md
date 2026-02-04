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
  conversationHistory: historyManager,
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
5. **Record history** - Add to conversation history for future context
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

## Configuration

```typescript
interface MessageProcessorConfig {
  inbox: InboxManager;
  connection: SmartHoleConnection;
  createLLMService: () => LLMService;
  app: App;
  settings: SmartHoleSettings;
  conversationHistory: ConversationHistory;
}
```

## Implementation

Located in `src/processor/`:
- `types.ts` - Configuration and result interfaces
- `MessageProcessor.ts` - Main orchestration class
- `index.ts` - Public exports
