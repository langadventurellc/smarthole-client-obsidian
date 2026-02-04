---
id: T-add-mid-execution-message
title: Add mid-execution message callback to MessageProcessor
status: done
priority: high
parent: F-send-message-tool
prerequisites: []
affectedFiles:
  src/processor/types.ts: Added AgentMessageCallback type definition with JSDoc comment
  src/processor/MessageProcessor.ts: Added agentMessageCallbacks array,
    onAgentMessage() registration method, and notifyAgentMessageCallbacks()
    notification method
  src/processor/index.ts: Added AgentMessageCallback to module exports
log:
  - >-
    Research completed. Verified file paths and patterns:

    - src/processor/types.ts exists with ResponseCallback and
    MessageReceivedCallback types

    - src/processor/MessageProcessor.ts exists with callback pattern (array +
    registration + notification)

    - Implementing AgentMessageCallback type and related methods following
    existing patterns
  - >-
    Added mid-execution message callback mechanism to MessageProcessor. This
    enables the send_message tool to deliver real-time messages to ChatView
    during LLM processing. The implementation includes:

    - AgentMessageCallback type in types.ts with content, isQuestion, and
    timestamp fields

    - agentMessageCallbacks array in MessageProcessor to store registered
    callbacks

    - onAgentMessage() method for callback registration with unsubscribe
    function

    - notifyAgentMessageCallbacks() public method for triggering callbacks
    (public for SendMessageContext access)

    - Export of AgentMessageCallback from processor module index
schema: v1.0
childrenIds: []
created: 2026-02-04T06:07:48.562Z
updated: 2026-02-04T06:07:48.562Z
---

# Add mid-execution message callback to MessageProcessor

## Purpose

Add a callback mechanism to MessageProcessor that allows the send_message tool to deliver messages to ChatView during LLM processing, before the final response is complete.

## Current State

- `responseCallbacks` notifies after processing completes
- `messageReceivedCallbacks` notifies when a message arrives for processing
- No mechanism for mid-execution messages from the agent

## Implementation

Add to `src/processor/MessageProcessor.ts`:

### New callback type in types.ts

```typescript
/**
 * Callback type for mid-execution messages from the agent.
 * Used by send_message tool to deliver real-time updates.
 */
export type AgentMessageCallback = (message: {
  content: string;
  isQuestion: boolean;
  timestamp: string;
}) => void;
```

### MessageProcessor changes

```typescript
export class MessageProcessor {
  // ... existing properties ...
  private agentMessageCallbacks: AgentMessageCallback[] = [];

  /**
   * Register a callback for mid-execution agent messages.
   * Returns an unsubscribe function.
   */
  onAgentMessage(callback: AgentMessageCallback): () => void {
    this.agentMessageCallbacks.push(callback);
    return () => {
      const idx = this.agentMessageCallbacks.indexOf(callback);
      if (idx >= 0) this.agentMessageCallbacks.splice(idx, 1);
    };
  }

  /**
   * Notify listeners of a mid-execution agent message.
   * Called by send_message tool context.
   */
  notifyAgentMessageCallbacks(content: string, isQuestion: boolean): void {
    const message = {
      content,
      isQuestion,
      timestamp: new Date().toISOString(),
    };
    for (const callback of this.agentMessageCallbacks) {
      try {
        callback(message);
      } catch (err) {
        console.error("MessageProcessor: Agent message callback error:", err);
      }
    }
  }
}
```

**Note:** The `notifyAgentMessageCallbacks` method is public (not private) so it can be called from the SendMessageContext created in `processWithRetry`.

## Integration Point

The `notifyAgentMessageCallbacks` method will be wrapped into `sendToChatView` function when creating the SendMessageContext (in T-integrate-send-message-tool). The wrapper must pass both `content` and `isQuestion` parameters.

## Acceptance Criteria

- [ ] `AgentMessageCallback` type defined in `src/processor/types.ts`
- [ ] `agentMessageCallbacks` array added to MessageProcessor
- [ ] `onAgentMessage()` method registers callbacks and returns unsubscribe function
- [ ] `notifyAgentMessageCallbacks()` is public and accepts content and isQuestion parameters

## Files to Modify

- `src/processor/types.ts` (add AgentMessageCallback type)
- `src/processor/MessageProcessor.ts` (add callback mechanism)