---
id: T-add-conversationstate-types
title: Add ConversationState types for tracking waiting state
status: done
priority: high
parent: F-conversation-state-management
prerequisites: []
affectedFiles:
  src/context/types.ts: Added PendingContext interface (originalMessageId,
    toolCallsCompleted, lastAgentMessage, createdAt) and ConversationState
    interface (isWaitingForResponse, pendingContext?)
  src/processor/types.ts: "Added isWaitingForResponse?: boolean field to ProcessResult interface"
  src/context/index.ts: Added exports for ConversationState and PendingContext types
log:
  - Added ConversationState and PendingContext types for tracking when the agent
    is waiting for a user response. Also added isWaitingForResponse field to
    ProcessResult to signal waiting state from the message processor.
schema: v1.0
childrenIds: []
created: 2026-02-04T17:49:35.511Z
updated: 2026-02-04T17:49:35.511Z
---

# Add ConversationState Types

## Purpose
Define the core type definitions needed to track whether the agent is waiting for a user response and the context of that pending state.

## Implementation

### New Types in `src/context/types.ts`

Add the `ConversationState` interface:

```typescript
/**
 * Tracks the current state of an active conversation.
 * Used to determine if the agent is waiting for a user response.
 */
export interface ConversationState {
  /** Whether the agent is currently waiting for user response */
  isWaitingForResponse: boolean;
  
  /** Context when waiting for a response */
  pendingContext?: {
    /** ID of the message that initiated this pending state */
    originalMessageId: string;
    /** Number of tool calls completed before asking the question */
    toolCallsCompleted: number;
    /** The last message sent by the agent (usually the question) */
    lastAgentMessage: string;
    /** Timestamp when the pending state was created */
    createdAt: string;
  };
}
```

### New Types in `src/processor/types.ts`

Update `ProcessResult` to include waiting state:

```typescript
export interface ProcessResult {
  success: boolean;
  messageId: string;
  response?: string;
  error?: string;
  /** NEW: Signals that the agent expects a follow-up message */
  isWaitingForResponse?: boolean;
}
```

## Acceptance Criteria
- [ ] `ConversationState` interface added to `src/context/types.ts`
- [ ] `ProcessResult` updated with `isWaitingForResponse` field
- [ ] Types exported from context module index
- [ ] All existing code continues to compile