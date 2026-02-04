---
id: T-subscribe-chatview-to-mid
title: Subscribe ChatView to mid-execution agent messages
status: done
priority: medium
parent: F-send-message-tool
prerequisites:
  - T-integrate-send-message-tool
affectedFiles:
  src/main.ts: Added import for AgentMessageCallback type and added
    onAgentMessage() method that delegates to MessageProcessor.onAgentMessage()
    for ChatView subscription
  src/views/ChatView.ts: Added unsubscribeAgentMessage property, subscribed to
    agent messages in onOpen() to display mid-execution messages as assistant
    messages, and added cleanup in onClose()
log:
  - Implemented ChatView subscription to mid-execution agent messages. Added the
    `onAgentMessage()` method to the plugin class that exposes the
    MessageProcessor's agent message callback registration. Updated ChatView to
    subscribe to these messages in `onOpen()` and properly clean up the
    subscription in `onClose()`. Mid-execution messages from the send_message
    tool will now appear as assistant messages in the chat sidebar in real-time,
    before the LLM processing completes.
schema: v1.0
childrenIds: []
created: 2026-02-04T06:08:10.470Z
updated: 2026-02-04T06:08:10.470Z
---

# Subscribe ChatView to mid-execution agent messages

## Purpose

Update ChatView to subscribe to mid-execution agent messages so that send_message tool output appears in the chat sidebar in real-time, before the LLM processing completes.

## Implementation

Modify `src/views/ChatView.ts`:

### Add subscription property

```typescript
export class ChatView extends ItemView {
  // ... existing properties ...
  private unsubscribeAgentMessage: (() => void) | null = null;
```

### Subscribe in onOpen

```typescript
async onOpen(): Promise<void> {
  // ... existing setup ...

  // Subscribe to mid-execution agent messages
  this.unsubscribeAgentMessage = this.plugin.onAgentMessage((msg) => {
    this.addMessage({
      id: `agent-${Date.now()}`,
      role: "assistant",
      content: msg.content,
      timestamp: msg.timestamp,
      // Note: toolsUsed not available for mid-execution messages
    });
  });
```

### Cleanup in onClose

```typescript
async onClose(): Promise<void> {
  this.unsubscribe?.();
  this.unsubscribe = null;

  this.unsubscribeMessageReceived?.();
  this.unsubscribeMessageReceived = null;

  this.unsubscribeAgentMessage?.();
  this.unsubscribeAgentMessage = null;

  // ... rest of cleanup ...
}
```

### Add method to main plugin

In `src/main.ts`, add method to expose the callback:

```typescript
/**
 * Register a callback for mid-execution agent messages.
 */
onAgentMessage(callback: AgentMessageCallback): () => void {
  return this.messageProcessor?.onAgentMessage(callback) ?? (() => {});
}
```

## Acceptance Criteria

- [ ] ChatView subscribes to agent messages in onOpen
- [ ] Mid-execution messages appear as assistant messages in chat
- [ ] Subscription cleaned up in onClose
- [ ] Plugin exposes onAgentMessage method for ChatView access
- [ ] Messages have unique IDs to prevent deduplication issues

## Files to Modify

- `src/views/ChatView.ts` (add subscription)
- `src/main.ts` (expose callback method)