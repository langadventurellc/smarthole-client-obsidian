---
id: T-connect-direct-input-to
title: Connect direct input to MessageProcessor
status: open
priority: high
parent: F-chat-sidebar-ui
prerequisites:
  - T-build-chat-message-display
affectedFiles: {}
log: []
schema: v1.0
childrenIds: []
created: 2026-02-03T19:12:46.344Z
updated: 2026-02-03T19:12:46.344Z
---

# Connect Direct Input to MessageProcessor

Wire up the chat input to process messages through the existing LLM pipeline and display responses in the sidebar.

## What to Implement

### 1. Add response callback to MessageProcessor

Modify `MessageProcessor` to support notifying listeners of completed responses:

```typescript
// In MessageProcessor
type ResponseCallback = (result: ProcessResult & { 
  originalMessage: string;
  toolsUsed: string[];
}) => void;

private responseCallbacks: ResponseCallback[] = [];

onResponse(callback: ResponseCallback): () => void {
  this.responseCallbacks.push(callback);
  return () => {
    const idx = this.responseCallbacks.indexOf(callback);
    if (idx >= 0) this.responseCallbacks.splice(idx, 1);
  };
}

// Call after successful processing in process():
this.responseCallbacks.forEach(cb => cb({
  ...result,
  originalMessage: message.payload.text,
  toolsUsed: extractedToolsUsed,
}));
```

### 2. Add processDirectMessage to Plugin

```typescript
// In SmartHolePlugin class
async processDirectMessage(text: string): Promise<void> {
  const routedMessage: RoutedMessage = {
    type: "message",
    payload: {
      id: crypto.randomUUID(),
      text,
      timestamp: new Date().toISOString(),
      metadata: {
        inputMethod: "text",
        source: "direct",
      },
    },
  };
  
  // Skip ack (no WebSocket to ack to)
  // Skip notification (response shown in UI instead)
  await this.messageProcessor.process(routedMessage, true);
}
```

### 3. Modify MessageProcessor.process() for direct messages

Check if message is direct (via metadata.source) and skip sending WebSocket notification:

```typescript
// After LLM processing succeeds
if (message.payload.metadata?.source !== "direct") {
  this.connection.sendNotification(messageId, { body: response });
}
```

### 4. Wire ChatView to plugin

ChatView needs reference to plugin to:
- Call `plugin.processDirectMessage(text)`
- Subscribe to `messageProcessor.onResponse()`

Pass plugin reference to ChatView constructor:
```typescript
export class ChatView extends ItemView {
  private plugin: SmartHolePlugin;
  private unsubscribe: (() => void) | null = null;
  
  constructor(leaf: WorkspaceLeaf, plugin: SmartHolePlugin) {
    super(leaf);
    this.plugin = plugin;
  }
  
  async onOpen() {
    // Subscribe to responses
    this.unsubscribe = this.plugin.messageProcessor.onResponse((result) => {
      this.addMessage({
        id: result.messageId,
        role: "assistant",
        content: result.response ?? "No response",
        timestamp: new Date().toISOString(),
        toolsUsed: result.toolsUsed,
      });
      this.hideTypingIndicator();
    });
    // ... rest of setup
  }
  
  async onClose() {
    this.unsubscribe?.();
  }
  
  private async handleSend(text: string) {
    // Add user message to display immediately
    this.addMessage({
      id: crypto.randomUUID(),
      role: "user",
      content: text,
      timestamp: new Date().toISOString(),
      source: "direct",
    });
    
    this.showTypingIndicator();
    
    try {
      await this.plugin.processDirectMessage(text);
    } catch (error) {
      this.hideTypingIndicator();
      this.addMessage({
        id: crypto.randomUUID(),
        role: "assistant",
        content: `Error: ${error.message}`,
        timestamp: new Date().toISOString(),
      });
    }
  }
}
```

### 5. Update view registration

```typescript
// In main.ts onload()
this.registerView(VIEW_TYPE_CHAT, (leaf) => new ChatView(leaf, this));
```

## Files to Modify
- `src/processor/MessageProcessor.ts` - Add response callback mechanism
- `src/processor/types.ts` - Add callback type if needed
- `src/main.ts` - Add processDirectMessage, update view registration
- `src/views/ChatView.ts` - Wire up send handler and response subscription
- `src/websocket/types.ts` - Add `source` to metadata type if not present

## Acceptance Criteria

1. Typing in sidebar and pressing Enter/Send triggers message processing
2. User message appears immediately in chat (optimistic)
3. "Thinking..." indicator shows during processing
4. Agent response appears in chat when processing completes
5. Tool actions from response displayed with the message
6. Errors display as error messages in chat
7. WebSocket notification NOT sent for direct messages
8. Multiple messages can be queued while one is processing