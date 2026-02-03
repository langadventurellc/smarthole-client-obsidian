---
id: T-integrate-conversation
title: Integrate conversation history and WebSocket messages
status: open
priority: medium
parent: F-chat-sidebar-ui
prerequisites:
  - T-connect-direct-input-to
affectedFiles: {}
log: []
schema: v1.0
childrenIds: []
created: 2026-02-03T19:13:08.238Z
updated: 2026-02-03T19:13:08.238Z
---

# Integrate Conversation History and WebSocket Messages

Load persisted conversation history when sidebar opens and display WebSocket-originated messages in the sidebar for a unified view.

## What to Implement

### 1. Load history on sidebar open

In `ChatView.onOpen()`, load and display existing conversation history:

```typescript
async onOpen() {
  // ... create DOM structure ...
  
  // Load persisted history
  const history = this.plugin.conversationHistory.getRecentConversations();
  
  for (const entry of history) {
    // Render user message
    this.addMessage({
      id: `${entry.timestamp}-user`,
      role: "user",
      content: entry.userMessage,
      timestamp: entry.timestamp,
      source: entry.source ?? "websocket", // Infer from metadata if available
    });
    
    // Render assistant response
    this.addMessage({
      id: `${entry.timestamp}-assistant`,
      role: "assistant", 
      content: entry.assistantResponse,
      timestamp: entry.timestamp,
      toolsUsed: entry.toolsUsed,
    });
  }
  
  this.scrollToBottom();
  
  // ... subscribe to new responses ...
}
```

### 2. Expose getRecentConversations in ConversationHistory

If not already exposed, add method to get the raw history entries:

```typescript
// In ConversationHistory
getRecentConversations(): HistoryEntry[] {
  return [...this.recentConversations];
}
```

### 3. Track message source in history

Update `HistoryEntry` type to include source:

```typescript
interface HistoryEntry {
  timestamp: string;
  userMessage: string;
  assistantResponse: string;
  toolsUsed: string[];
  source?: "direct" | "websocket"; // Add this
}
```

When adding conversations, include source from message metadata:

```typescript
// In MessageProcessor, when calling addConversation
await this.conversationHistory.addConversation({
  timestamp: new Date().toISOString(),
  userMessage: message.payload.text,
  assistantResponse: response,
  toolsUsed: extractedToolsUsed,
  source: message.payload.metadata?.source === "direct" ? "direct" : "websocket",
});
```

### 4. Display WebSocket messages in real-time

The response callback added in the previous task will handle this - both direct and WebSocket messages go through MessageProcessor and trigger the callback.

However, also show the user message for WebSocket-originated conversations. Add a message callback:

```typescript
// In MessageProcessor
type MessageReceivedCallback = (message: RoutedMessage) => void;
private messageCallbacks: MessageReceivedCallback[] = [];

onMessageReceived(callback: MessageReceivedCallback): () => void {
  this.messageCallbacks.push(callback);
  return () => {
    const idx = this.messageCallbacks.indexOf(callback);
    if (idx >= 0) this.messageCallbacks.splice(idx, 1);
  };
}

// Call at start of process():
this.messageCallbacks.forEach(cb => cb(message));
```

In ChatView, subscribe to this as well:
```typescript
// In onOpen()
this.unsubscribeMessage = this.plugin.messageProcessor.onMessageReceived((msg) => {
  // Only show if not direct (direct messages already shown by handleSend)
  if (msg.payload.metadata?.source !== "direct") {
    this.addMessage({
      id: msg.payload.id,
      role: "user",
      content: msg.payload.text,
      timestamp: msg.payload.timestamp,
      source: "websocket",
    });
    this.showTypingIndicator();
  }
});
```

### 5. Optional: Source indicator in UI

Add subtle indicator showing message origin:

```css
.smarthole-chat-source {
  font-size: var(--font-smallest);
  color: var(--text-faint);
  margin-top: var(--size-4-1);
}
```

```typescript
// In renderMessage, for user messages:
if (message.source) {
  const sourceEl = messageEl.createEl("div", { cls: "smarthole-chat-source" });
  sourceEl.setText(message.source === "direct" ? "typed" : "voice");
}
```

### 6. Prevent duplicate messages

Track rendered message IDs to avoid duplicates when history loads and real-time updates overlap:

```typescript
private renderedMessageIds = new Set<string>();

addMessage(message: ChatMessage) {
  if (this.renderedMessageIds.has(message.id)) return;
  this.renderedMessageIds.add(message.id);
  // ... render message ...
}
```

## Files to Modify
- `src/views/ChatView.ts` - Load history, subscribe to message received
- `src/views/ChatView.css` - Source indicator styling
- `src/context/ConversationHistory.ts` - Expose getRecentConversations if needed
- `src/context/types.ts` - Add source to HistoryEntry
- `src/processor/MessageProcessor.ts` - Add message received callback, include source in history

## Acceptance Criteria

1. Opening sidebar loads and displays existing conversation history
2. History shows both user messages and assistant responses
3. Tool actions visible for historical messages that used tools
4. New WebSocket messages appear in sidebar in real-time (if sidebar open)
5. Source indicator shows "typed" vs "voice" (or similar) for each message
6. No duplicate messages when history overlaps with real-time updates
7. Scroll position at bottom after loading history