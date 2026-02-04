---
id: E-communication-and-conversation
title: Communication and Conversation State
status: open
priority: high
parent: P-agentic-architecture-overhaul
prerequisites:
  - E-file-operation-tools
affectedFiles: {}
log: []
schema: v1.0
childrenIds: []
created: 2026-02-04T01:58:12.351Z
updated: 2026-02-04T01:58:12.351Z
---

# Communication and Conversation State

## Purpose and Goals

Transform the agent from a one-shot response system to a multi-turn conversational assistant. This includes:
1. Making user communication an explicit tool the agent invokes
2. Enabling the agent to ask questions and wait for responses
3. Tracking conversation state across messages

## Major Components and Deliverables

### 1. Send Message Tool (`src/llm/tools/sendMessage.ts`)
- Send message to user via SmartHole (for WebSocket messages) or ChatView (for direct messages)
- Can be called multiple times during execution
- Messages appear in real-time (not batched until end)
- Requires `SendMessageContext` passed to tool factory

### 2. Conversation State Types (`src/context/types.ts`, `src/processor/types.ts`)
New types for tracking conversation state:
```typescript
interface ConversationState {
  isWaitingForResponse: boolean;
  pendingContext?: {
    originalMessageId: string;
    toolCallsCompleted: number;
    lastAgentMessage: string;
  };
}
```

### 3. LLMService Conversation State (`src/llm/LLMService.ts`)
- Handle conversation state tracking
- Integrate sendMessage tool with notification channels
- Distinguish between "task complete" and "waiting for response"
- Signal waiting state when agent asks a question

### 4. MessageProcessor Conversation Support (`src/processor/MessageProcessor.ts`)
- Support ongoing conversations (not one-shot)
- Continue existing conversation context when user responds
- Track pending conversations per message source
- Persist conversation state for crash recovery

## Acceptance Criteria

### Communication
- [ ] `send_message` sends message to user via SmartHole
- [ ] `send_message` displays in ChatView for direct messages
- [ ] Agent can call `send_message` multiple times during execution
- [ ] Messages appear in real-time (not batched until end)

### Conversation State
- [ ] Agent can ask questions and wait for response
- [ ] Conversation state persists between messages
- [ ] Next user message continues existing conversation context
- [ ] Clear distinction between "task complete" and "awaiting response"
- [ ] Safety limit on tool iterations remains in place (MAX_TOOL_ITERATIONS = 10)

## Technical Considerations

### SendMessage Context
The tool needs access to notification channels:
```typescript
interface SendMessageContext {
  sendToSmartHole: (message: string, priority?: 'normal' | 'high') => void;
  sendToChatView: (message: string) => void;
  source: 'websocket' | 'direct';
}

function createSendMessageTool(context: SendMessageContext): ToolHandler
```

### Conversation State Detection
When agent sends a message that ends with a question or explicitly signals "waiting", set `isWaitingForResponse = true`. Next incoming message continues that context.

### MessageProcessor Changes
- Currently creates fresh LLMService per message (stateless)
- Need to preserve LLMService state for ongoing conversations
- Store conversation state alongside message history
- Handle crash recovery for mid-conversation state

## Dependencies

- E-file-operation-tools (for consistent tool patterns)

## User Stories

- As an agent, I can send progress updates while performing long operations
- As an agent, I can ask clarifying questions and wait for the user's response
- As an agent, I can provide partial results before continuing work
- As a user, my follow-up message continues the conversation seamlessly

## Non-functional Requirements

- Real-time message delivery (no perceptible delay)
- Conversation state persists across plugin restarts
- Clear UX indication when agent is waiting for response vs task complete

## Estimated Scale

3-4 features (sendMessage tool, conversation state types, LLMService changes, MessageProcessor changes)