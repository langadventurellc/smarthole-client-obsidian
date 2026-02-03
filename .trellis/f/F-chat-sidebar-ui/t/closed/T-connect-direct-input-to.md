---
id: T-connect-direct-input-to
title: Connect direct input to MessageProcessor
status: done
priority: high
parent: F-chat-sidebar-ui
prerequisites:
  - T-build-chat-message-display
affectedFiles:
  src/processor/types.ts: Added ResponseCallback type for notifying listeners of
    processed message results
  src/processor/index.ts: Exported ResponseCallback type
  src/processor/MessageProcessor.ts: Added response callback mechanism
    (onResponse, notifyResponseCallbacks) and conditional WebSocket notification
    skip for direct messages
  src/websocket/types.ts: Added optional source field to MessageMetadata interface
  src/main.ts: Made messageProcessor public, added processDirectMessage() and
    onMessageResponse() methods, updated view registration to pass plugin
    reference
  src/views/ChatView.ts: Added plugin constructor parameter, unsubscribe property,
    wired send handler to processDirectMessage, subscribed to response callbacks
    in onOpen, cleanup in onClose
log:
  - >-
    Research phase complete. Analyzed all relevant files:

    - MessageProcessor.ts: Needs response callback mechanism and conditional
    notification skip for direct messages

    - main.ts: Needs processDirectMessage method, updated view registration to
    pass plugin reference

    - ChatView.ts: Needs plugin constructor parameter, send handler wiring,
    response subscription

    - websocket/types.ts: MessageMetadata already supports inputMethod and
    directRouted but needs source field for direct messages

    - processor/types.ts: Needs ResponseCallback type


    Verified file paths exist and patterns identified. Starting implementation.
  - >-
    Connected the chat sidebar input to the MessageProcessor pipeline so
    messages typed in the sidebar are processed through the LLM and responses
    are displayed.


    Key changes:

    1. Added ResponseCallback type to processor/types.ts for notifying listeners
    of processing results

    2. Updated MessageMetadata in websocket/types.ts to include optional
    `source` field ("direct" | "websocket")

    3. Added response callback mechanism to MessageProcessor with onResponse()
    method and notifyResponseCallbacks()

    4. Modified MessageProcessor.process() to skip WebSocket notifications for
    direct messages (source === "direct") while still calling response callbacks

    5. Made messageProcessor public on SmartHolePlugin for ChatView access

    6. Added processDirectMessage() method to SmartHolePlugin that creates a
    synthetic RoutedMessage with source: "direct"

    7. Added onMessageResponse() helper method on SmartHolePlugin

    8. Updated ChatView constructor to accept plugin reference

    9. Wired ChatView.onOpen() to subscribe to response callbacks and set up
    send handler that calls processDirectMessage()

    10. Added cleanup in ChatView.onClose() to unsubscribe from response
    callbacks

    11. Updated view registration in main.ts to pass plugin reference to
    ChatView


    The implementation enables:

    - Typing in sidebar and pressing Enter/Send triggers message processing

    - User message appears immediately (optimistic UI)

    - "Thinking..." indicator shows during processing

    - Agent response appears when processing completes

    - Tool actions displayed with assistant messages

    - Errors display as error messages

    - WebSocket notification NOT sent for direct messages

    - Input remains enabled during processing (allows queuing)
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