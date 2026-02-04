---
id: F-send-message-tool
title: Send Message Tool
status: open
priority: high
parent: E-communication-and-conversation
prerequisites: []
affectedFiles: {}
log: []
schema: v1.0
childrenIds: []
created: 2026-02-04T06:03:20.173Z
updated: 2026-02-04T06:03:20.173Z
---

# Send Message Tool

## Purpose

Create a `send_message` tool that allows the agent to communicate with users during task execution, not just at the end. This is the foundation for conversational interaction.

## Current State

- Agent can only communicate at the end of processing via SmartHole notification or ChatView response
- No mechanism for mid-execution updates or questions
- All tools are file-operation tools with no communication capability

## Implementation

### Tool Definition (`src/llm/tools/sendMessage.ts`)

```typescript
interface SendMessageInput {
  message: string;      // The message to send to the user
  is_question?: boolean; // Whether this message is asking for user input
}
```

### SendMessageContext Interface

The tool needs access to notification channels, which must be passed from MessageProcessor:

```typescript
interface SendMessageContext {
  sendToSmartHole: (message: string, priority?: 'normal' | 'high') => void;
  sendToChatView: (message: string) => void;
  source: 'websocket' | 'direct';
}
```

### Tool Factory Pattern

```typescript
function createSendMessageTool(context: SendMessageContext): ToolHandler
```

### Integration with MessageProcessor

- MessageProcessor must create SendMessageContext with appropriate channel functions
- Pass context to tool factory when registering tools
- Tool uses `source` to determine whether to use SmartHole or ChatView

### Real-time Delivery

- Messages sent immediately (not batched)
- For WebSocket messages: use `connection.sendNotification()` 
- For direct messages: use ChatView callback mechanism

## Acceptance Criteria

- [ ] `send_message` sends message to user via SmartHole for WebSocket messages
- [ ] `send_message` displays in ChatView for direct messages
- [ ] Agent can call `send_message` multiple times during execution
- [ ] Messages appear in real-time (not batched until end)
- [ ] `is_question` parameter properly signals waiting state (for integration with conversation state feature)

## Technical Notes

- Follow existing tool patterns from `src/llm/tools/` directory
- Export from `src/llm/tools/index.ts`
- Tool should be registered separately from vault tools (needs context)