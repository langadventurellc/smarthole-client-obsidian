---
id: T-subscribe-chatview-to-mid
title: Subscribe ChatView to mid-execution agent messages
status: open
priority: medium
parent: F-send-message-tool
prerequisites:
  - T-integrate-send-message-tool
affectedFiles: {}
log: []
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