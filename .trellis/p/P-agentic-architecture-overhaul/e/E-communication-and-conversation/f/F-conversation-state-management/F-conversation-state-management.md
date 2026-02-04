---
id: F-conversation-state-management
title: Conversation State Management
status: in-progress
priority: high
parent: E-communication-and-conversation
prerequisites: []
affectedFiles:
  src/context/types.ts: Added PendingContext interface (originalMessageId,
    toolCallsCompleted, lastAgentMessage, createdAt) and ConversationState
    interface (isWaitingForResponse, pendingContext?)
  src/processor/types.ts: "Added isWaitingForResponse?: boolean field to
    ProcessResult interface; Added SmartHolePlugin import and plugin property to
    MessageProcessorConfig interface for persistence access"
  src/context/index.ts: Added exports for ConversationState and PendingContext types
  src/llm/LLMService.ts: Added ConversationState import, state tracking properties
    (waitingForResponse, lastQuestionMessage, toolCallsInSession), and
    conversation state management methods (isWaitingForUserResponse,
    getConversationState, restoreConversationState, setWaitingForResponse,
    clearWaitingState). Updated executeToolCalls to track tool call count.
  src/llm/tools/sendMessage.ts: Extended SendMessageContext interface with
    optional setWaitingForResponse callback. Updated execute function to call
    setWaitingForResponse when is_question=true.
  src/processor/MessageProcessor.ts: Added setWaitingForResponse callback to
    SendMessageContext that delegates to llmService.setWaitingForResponse().;
    Added ConversationState import, SmartHolePlugin import,
    CONVERSATION_STATES_KEY constant, plugin property, conversationStates Map,
    buildContinuationContext(), persistConversationStates(),
    loadConversationStates(), and updated processWithRetry() to restore/persist
    conversation state
  src/main.ts: "Added plugin: this to MessageProcessor config"
log: []
schema: v1.0
childrenIds:
  - T-add-crash-recovery-and-stale
  - T-implement-conversation-state
  - T-add-conversationstate-types
  - T-extend-llmservice-to-track
created: 2026-02-04T06:03:35.444Z
updated: 2026-02-04T06:03:35.444Z
---

# Conversation State Management

## Purpose

Enable the agent to ask questions and wait for user responses by tracking conversation state across messages. Transform from one-shot processing to multi-turn conversational interaction.

## Current State

- MessageProcessor creates fresh LLMService per message (stateless)
- No tracking of whether agent is waiting for a response
- Each message treated as independent request
- No mechanism to continue context from previous message

## Implementation

### New Types (`src/context/types.ts`, `src/processor/types.ts`)

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

### LLMService Changes (`src/llm/LLMService.ts`)

- Track conversation state within service instance
- Detect when agent asks a question (message ends with `?` or `is_question=true` from send_message)
- Signal waiting state when appropriate
- Return conversation state from `processMessage()` or via new method

### MessageProcessor Changes (`src/processor/MessageProcessor.ts`)

**State preservation:**
- Maintain map of active conversation states per message source/context
- When processing a new message, check if there's pending conversation state
- If pending, restore LLMService context (inject previous context into system prompt)
- Persist conversation state for crash recovery

**State detection:**
```typescript
interface ProcessResult {
  success: boolean;
  messageId: string;
  response?: string;
  error?: string;
  isWaitingForResponse?: boolean; // NEW: signals agent expects follow-up
}
```

**Continuation logic:**
- When `isWaitingForResponse` is true on previous result, next message continues that context
- Clear pending state when task is completed (not waiting)

### Persistence

- Store conversation state in plugin data alongside message history
- Handle crash recovery: on restart, check for pending states
- Clean up stale pending states (configurable timeout)

## Acceptance Criteria

- [ ] Agent can ask questions and wait for response
- [ ] Conversation state persists between messages
- [ ] Next user message continues existing conversation context
- [ ] Clear distinction between "task complete" and "awaiting response"
- [ ] Safety limit on tool iterations remains in place (MAX_TOOL_ITERATIONS = 10)
- [ ] Conversation state persists across plugin restarts
- [ ] Stale pending states cleaned up after timeout

## Technical Notes

- Conversation state is different from conversation history (ConversationHistory stores completed exchanges, this tracks active ones)
- Need to integrate with send_message tool's `is_question` parameter
- Consider UX indication when agent is waiting vs task complete