---
id: T-create-sendmessagecontext
title: Create SendMessageContext interface and types
status: done
priority: high
parent: F-send-message-tool
prerequisites: []
affectedFiles:
  src/llm/tools/sendMessage.ts: Created new file with SendMessageContext interface
    (sendToSmartHole, sendToChatView, source properties) and SendMessageInput
    interface (message, is_question properties). Includes comprehensive JSDoc
    documentation explaining the purpose of each field.
log:
  - Created the SendMessageContext interface and SendMessageInput type
    definitions for the send_message tool. The file follows existing tool
    conventions with proper file header comments, section separators, and JSDoc
    documentation for all interfaces and properties. Both interfaces are
    exported and ready for use by subsequent tasks that will implement the tool
    factory and integration.
schema: v1.0
childrenIds: []
created: 2026-02-04T06:07:22.236Z
updated: 2026-02-04T06:07:22.236Z
---

# Create SendMessageContext interface and types

## Purpose

Define the context interface that provides communication channels to the send_message tool. This interface abstracts the notification mechanisms so the tool doesn't need to know about SmartHole connection or ChatView internals.

## Implementation

Create types in `src/llm/tools/sendMessage.ts` (top of file, before tool implementation):

```typescript
/**
 * Context providing communication channels to the send_message tool.
 * Passed to the tool factory during registration.
 */
export interface SendMessageContext {
  /**
   * Send a message via SmartHole notification.
   * Used when the original message came from WebSocket.
   */
  sendToSmartHole: (message: string, priority?: 'normal' | 'high') => void;
  
  /**
   * Send a message to the ChatView sidebar.
   * Used for both direct and WebSocket messages (ChatView shows all).
   * @param message - The message content to display
   * @param isQuestion - Whether this message is asking for user input
   */
  sendToChatView: (message: string, isQuestion: boolean) => void;
  
  /**
   * Source of the original message being processed.
   * Determines which channel is primary for responses.
   */
  source: 'websocket' | 'direct';
}

/**
 * Input schema for the send_message tool.
 */
export interface SendMessageInput {
  /** The message to send to the user */
  message: string;
  /** Whether this message is asking for user input (signals waiting state) */
  is_question?: boolean;
}
```

## Acceptance Criteria

- [ ] `SendMessageContext` interface defined with all three properties
- [ ] `sendToChatView` accepts both message and isQuestion parameters
- [ ] `SendMessageInput` interface defined with message and is_question
- [ ] Types are exported from the module
- [ ] JSDoc comments explain the purpose of each field

## Files to Create/Modify

- Create: `src/llm/tools/sendMessage.ts` (initial file with types only)