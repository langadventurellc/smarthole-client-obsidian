# Message Processor

Orchestrates the complete message processing pipeline from inbox persistence through LLM processing to notification delivery.

## Initialization

```typescript
import { MessageProcessor } from "./processor";

const processor = new MessageProcessor({
  connection: smartHoleConnection,
  inboxManager: inboxManager,
  app: obsidianApp,
  settings: pluginSettings,
  conversationManager: conversationManager,
  plugin: pluginInstance,  // Required for conversation state persistence
});

// Initialize must be called after construction
await processor.initialize();
```

The `initialize()` method loads any persisted conversation states from the previous session and cleans up stale states that have exceeded the configured timeout.

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

// Subscribe to retrospection completion
processor.onRetrospection((result) => {
  // Display retrospection insights in chat
  console.log(result.conversationTitle, result.content);
});
```

### Cancelling Processing

```typescript
// Cancel the in-flight LLM request (safe to call at any time, no-op if idle)
processor.cancelCurrentProcessing();
```

When cancelled, the processor:
- Calls `LLMService.abort()` on the active service instance
- Returns `{ success: true, response: "", toolsUsed: [] }` (no error notification)
- Skips retry logic entirely (abort errors are non-retryable)
- Does not record messages to ConversationManager

This is exposed on the Plugin as `plugin.cancelCurrentProcessing()` for use by the ChatView stop button.

## Process Result

```typescript
interface ProcessResult {
  success: boolean;
  messageId: string;
  response?: string;            // LLM's text response
  toolsUsed?: string[];         // Tools invoked during processing
  error?: string;               // Error message if failed
  isWaitingForResponse?: boolean; // Agent expects follow-up message
}
```

When `isWaitingForResponse` is `true`, the agent has asked a question and is waiting for the user's reply. The next message in the same conversation will continue with the pending context.

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
- User-initiated cancellation (`aborted`) -- returns success, no error notification

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

## Conversation State Persistence

The processor tracks active conversation states to enable multi-turn interactions where the agent asks questions and waits for user responses:

### How It Works

1. When the agent calls `send_message` with `is_question=true`, the LLMService signals a waiting state
2. The processor persists this state to plugin data storage, keyed by conversation ID
3. When the next message arrives in the same conversation, the pending context is restored
4. The system prompt is augmented with continuation context about the pending question
5. Stale states (older than `conversationStateTimeoutMinutes`) are cleaned up periodically

### State Lifecycle

```
User message → Agent processes → Agent asks question (is_question=true)
                                         ↓
                              State persisted (waiting)
                                         ↓
                              User replies
                                         ↓
                              State restored, continuation context injected
                                         ↓
                              Agent continues conversation
                                         ↓
                              State cleared (no longer waiting)
```

### Crash Recovery

On plugin restart, `initialize()` loads persisted conversation states. If the plugin crashed while waiting for a user response, that state is preserved and the conversation can continue naturally.

### Stale State Cleanup

States are considered stale when `pendingContext.createdAt` is older than `conversationStateTimeoutMinutes` (default: 60 minutes). Cleanup runs:
- Once during `initialize()`
- Every 15 minutes via a registered interval

```typescript
// Manual cleanup if needed
await processor.cleanupStaleStates();
```

## Conversation Retrospection

When `enableConversationRetrospection` is enabled in settings, the processor launches a background LLM call after conversations end to reflect on opportunities for improvement. This runs as a fire-and-forget async task using a separate `LLMService` instance (no tools registered), so it never blocks or delays the user's response.

### Trigger Paths

**Explicit ending (end_conversation tool):** After the LLM response is recorded, the processor checks if `end_conversation` was among the tools used. If so, the most recently ended conversation is retrieved and retrospection is launched in the background.

**Idle timeout:** Before calling `conversationManager.addMessage()`, the processor captures the active conversation ID. After the call, if the active ID has changed (meaning the old conversation was ended due to idle timeout), retrospection is launched for the ended conversation.

### Retrospection Flow

1. `RetrospectionService` builds a prompt from the conversation's messages and the user's `retrospectionPrompt` setting
2. A fresh `LLMService` is created with no tools (read-only reflection)
3. The LLM response is persisted to `.smarthole/retrospection.md` (prepended as a dated Markdown section)
4. Registered `onRetrospection` callbacks are notified with the result (used by ChatView to display a system message)
5. Failures are logged to console and silently ignored

## Configuration

```typescript
interface MessageProcessorConfig {
  connection: SmartHoleConnection;
  inboxManager: InboxManager;
  app: App;
  settings: SmartHoleSettings;
  conversationManager: ConversationManager;
  plugin: SmartHolePlugin;  // For loadData/saveData persistence
}
```

## Implementation

Located in `src/processor/`:
- `types.ts` - Configuration and result interfaces (includes `AgentMessageCallback`, `RetrospectionCallback`)
- `MessageProcessor.ts` - Main orchestration class
- `index.ts` - Public exports
