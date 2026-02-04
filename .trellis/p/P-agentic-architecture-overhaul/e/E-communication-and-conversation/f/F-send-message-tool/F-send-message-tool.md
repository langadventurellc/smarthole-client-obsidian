---
id: F-send-message-tool
title: Send Message Tool
status: in-progress
priority: high
parent: E-communication-and-conversation
prerequisites: []
affectedFiles:
  src/processor/types.ts: Added AgentMessageCallback type definition with JSDoc comment
  src/processor/MessageProcessor.ts: Added agentMessageCallbacks array,
    onAgentMessage() registration method, and notifyAgentMessageCallbacks()
    notification method; Added imports for createSendMessageTool and
    SendMessageContext. In processWithRetry(), created SendMessageContext with
    channel functions and registered the send_message tool with LLMService.
  src/processor/index.ts: Added AgentMessageCallback to module exports
  src/llm/tools/sendMessage.ts: Created new file with SendMessageContext interface
    (sendToSmartHole, sendToChatView, source properties) and SendMessageInput
    interface (message, is_question properties). Includes comprehensive JSDoc
    documentation explaining the purpose of each field.; Added imports for
    ToolHandler and Tool types, added toolDefinition constant with name
    'send_message', description, and inputSchema, and added
    createSendMessageTool factory function that creates a ToolHandler with
    validation, ChatView and SmartHole delivery logic, and appropriate return
    messages
  src/llm/tools/index.ts: Added exports for createSendMessageTool,
    SendMessageContext, and SendMessageInput from sendMessage module
  src/llm/index.ts: Added re-exports for createSendMessageTool,
    SendMessageContext, and SendMessageInput from tools module
log: []
schema: v1.0
childrenIds:
  - T-integrate-send-message-tool
  - T-subscribe-chatview-to-mid
  - T-add-mid-execution-message
  - T-create-sendmessagecontext
  - T-implement-send-message-tool
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