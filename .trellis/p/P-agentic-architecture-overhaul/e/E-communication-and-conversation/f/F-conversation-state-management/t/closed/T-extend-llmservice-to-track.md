---
id: T-extend-llmservice-to-track
title: Extend LLMService to track and signal conversation state
status: done
priority: high
parent: F-conversation-state-management
prerequisites:
  - T-add-conversationstate-types
affectedFiles:
  src/llm/LLMService.ts: Added ConversationState import, state tracking properties
    (waitingForResponse, lastQuestionMessage, toolCallsInSession), and
    conversation state management methods (isWaitingForUserResponse,
    getConversationState, restoreConversationState, setWaitingForResponse,
    clearWaitingState). Updated executeToolCalls to track tool call count.
  src/llm/tools/sendMessage.ts: Extended SendMessageContext interface with
    optional setWaitingForResponse callback. Updated execute function to call
    setWaitingForResponse when is_question=true.
  src/processor/MessageProcessor.ts: Added setWaitingForResponse callback to
    SendMessageContext that delegates to llmService.setWaitingForResponse().
log:
  - >-
    Completed research phase. Findings:

    - ConversationState and PendingContext types already exist in
    src/context/types.ts

    - ProcessResult in src/processor/types.ts has isWaitingForResponse field

    - LLMService needs new state tracking properties and methods

    - SendMessageContext needs setWaitingForResponse callback

    - MessageProcessor needs to pass setWaitingForResponse to SendMessageContext


    Implementation plan:

    1. Add state tracking properties to LLMService (waitingForResponse,
    lastQuestionMessage, toolCallsInSession)

    2. Add methods: isWaitingForUserResponse(), getConversationState(),
    restoreConversationState(), setWaitingForResponse(), clearWaitingState()

    3. Track tool calls in executeToolCalls method

    4. Update SendMessageContext interface to include setWaitingForResponse
    callback

    5. Update createSendMessageTool to call setWaitingForResponse when
    is_question=true

    6. Update MessageProcessor to pass setWaitingForResponse to
    SendMessageContext
  - >-
    Extended LLMService to track and signal conversation state for multi-turn
    interactions.


    Key changes:

    1. Added state tracking properties to LLMService: waitingForResponse,
    lastQuestionMessage, toolCallsInSession

    2. Implemented isWaitingForUserResponse() to check current waiting state

    3. Implemented getConversationState() to return ConversationState for
    persistence

    4. Implemented restoreConversationState() to restore state after plugin
    restart

    5. Implemented setWaitingForResponse() for send_message tool to signal
    waiting state

    6. Implemented clearWaitingState() to reset state when conversation
    continues/completes

    7. Updated executeToolCalls() to track tool call count in session

    8. Extended SendMessageContext interface with optional setWaitingForResponse
    callback

    9. Updated createSendMessageTool to call setWaitingForResponse when
    is_question=true

    10. Updated MessageProcessor to pass setWaitingForResponse callback to
    SendMessageContext


    All quality checks pass (format, lint, type-check).
schema: v1.0
childrenIds: []
created: 2026-02-04T17:49:48.262Z
updated: 2026-02-04T17:49:48.262Z
---

# Extend LLMService to Track Conversation State

## Purpose
Enable LLMService to track when the agent is waiting for a user response and expose this state for MessageProcessor to persist.

## Current State
- LLMService processes messages and returns responses
- No mechanism to signal "waiting for user response" state
- `send_message` tool has `is_question` flag but it's not tracked at service level

## Implementation

### LLMService Changes (`src/llm/LLMService.ts`)

1. **Add state tracking property:**
```typescript
private waitingForResponse = false;
private lastQuestionMessage: string | null = null;
private toolCallsInSession = 0;
```

2. **Add method to check/get waiting state:**
```typescript
/**
 * Check if the agent is currently waiting for a user response.
 */
isWaitingForUserResponse(): boolean {
  return this.waitingForResponse;
}

/**
 * Get the current conversation state for persistence.
 */
getConversationState(): { isWaiting: boolean; lastQuestion: string | null; toolCalls: number } {
  return {
    isWaiting: this.waitingForResponse,
    lastQuestion: this.lastQuestionMessage,
    toolCalls: this.toolCallsInSession,
  };
}

/**
 * Restore conversation state from persistence.
 */
restoreConversationState(state: { isWaiting: boolean; lastQuestion: string | null }): void {
  this.waitingForResponse = state.isWaiting;
  this.lastQuestionMessage = state.lastQuestion;
}
```

3. **Track tool calls in executeToolCalls:**
```typescript
// Increment counter when executing tool calls
private async executeToolCalls(toolCalls: ToolCall[]): Promise<ToolResultContentBlock[]> {
  const results: ToolResultContentBlock[] = [];
  for (const call of toolCalls) {
    const result = await this.executeToolCall(call);
    results.push(result);
    this.toolCallsInSession++;
  }
  return results;
}
```

4. **Add method to signal waiting state (called by send_message tool):**
```typescript
/**
 * Signal that the agent is waiting for a user response.
 * Called by send_message tool when is_question=true.
 */
setWaitingForResponse(message: string): void {
  this.waitingForResponse = true;
  this.lastQuestionMessage = message;
}

/**
 * Clear waiting state when conversation continues.
 */
clearWaitingState(): void {
  this.waitingForResponse = false;
  this.lastQuestionMessage = null;
  this.toolCallsInSession = 0;
}
```

### SendMessage Tool Integration

Update `createSendMessageTool` to accept LLMService reference and call `setWaitingForResponse` when `is_question=true`:

```typescript
// In sendMessage.ts context interface
export interface SendMessageContext {
  // ... existing fields ...
  setWaitingForResponse?: (message: string) => void;
}

// In execute function
if (isQuestion && context.setWaitingForResponse) {
  context.setWaitingForResponse(message);
}
```

## Acceptance Criteria
- [ ] LLMService tracks `waitingForResponse` state
- [ ] `isWaitingForUserResponse()` method returns current state
- [ ] `getConversationState()` returns full state for persistence
- [ ] `restoreConversationState()` restores state from persistence
- [ ] `send_message` tool with `is_question=true` triggers state update
- [ ] Tool call counter tracks iterations for state preservation
- [ ] State clears appropriately when processing resumes