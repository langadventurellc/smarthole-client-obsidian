---
id: T-implement-conversation-state
title: Implement conversation state persistence in MessageProcessor
status: done
priority: high
parent: F-conversation-state-management
prerequisites:
  - T-add-conversationstate-types
  - T-extend-llmservice-to-track
affectedFiles:
  src/processor/types.ts: Added SmartHolePlugin import and plugin property to
    MessageProcessorConfig interface for persistence access
  src/processor/MessageProcessor.ts: Added ConversationState import,
    SmartHolePlugin import, CONVERSATION_STATES_KEY constant, plugin property,
    conversationStates Map, buildContinuationContext(),
    persistConversationStates(), loadConversationStates(), and updated
    processWithRetry() to restore/persist conversation state
  src/main.ts: "Added plugin: this to MessageProcessor config"
log:
  - >-
    Research phase completed. Verified:

    - MessageProcessorConfig in src/processor/types.ts does NOT have plugin
    reference (needs to be added)

    - main.ts creates MessageProcessor at line 76 without plugin reference
    (needs to be updated)

    - ConversationState and PendingContext types are exported from
    src/context/index.ts

    - LLMService has getConversationState(), restoreConversationState(),
    clearWaitingState() methods

    - ConversationManager.getActiveConversation() returns Conversation | null


    Implementation plan:

    1. Update MessageProcessorConfig to include plugin reference

    2. Update main.ts to pass plugin reference

    3. Add conversationStates Map to MessageProcessor

    4. Add persistConversationStates and loadConversationStates methods

    5. Add buildContinuationContext helper

    6. Persist state after LLM processing when isWaiting

    7. Restore context before LLM processing for follow-up messages
  - >-
    Implemented conversation state persistence in MessageProcessor to enable
    multi-turn conversations where the agent can ask questions and wait for user
    responses.


    Key changes:

    1. Updated MessageProcessorConfig to include plugin reference for
    persistence

    2. Updated main.ts to pass plugin reference when creating MessageProcessor

    3. Added conversationStates Map to track active conversation states by
    conversation ID

    4. Implemented persistConversationStates() to save state to plugin data
    storage

    5. Implemented loadConversationStates() to restore state on initialization

    6. Added buildContinuationContext() helper to generate system prompt context
    for follow-ups

    7. Modified processWithRetry() to:
       - Check for pending state at start and restore LLM context with continuation prompt
       - Clear pending state when processing a follow-up response
       - Persist conversation state when agent asks a question (isWaitingForResponse=true)

    The implementation integrates with:

    - ConversationManager.getActiveConversation() for conversation IDs

    - LLMService.getConversationState()/restoreConversationState() from
    prerequisite T-extend-llmservice-to-track

    - ConversationState/PendingContext types from prerequisite
    T-add-conversationstate-types

    - Plugin loadData()/saveData() for persistence across restarts
schema: v1.0
childrenIds: []
created: 2026-02-04T17:50:04.452Z
updated: 2026-02-04T17:50:04.452Z
---

# Implement Conversation State Persistence

## Purpose
Enable MessageProcessor to persist conversation state so that follow-up messages continue the existing conversation context, and state survives plugin restarts.

## Current State
- MessageProcessor creates fresh LLMService per message (line 273)
- No state preserved between messages
- Each message treated independently
- MessageProcessorConfig does NOT have a plugin reference (only has `app`, `settings`, `connection`, `inboxManager`, `conversationManager`)
- ConversationManager already has `getActiveConversation()` method (line 57)

## Implementation

### Config Updates (`src/processor/types.ts`)

**CRITICAL**: Update `MessageProcessorConfig` to include plugin reference for persistence:
```typescript
import type SmartHolePlugin from "../main";

export interface MessageProcessorConfig {
  connection: SmartHoleConnection;
  inboxManager: InboxManager;
  app: App;
  settings: SmartHoleSettings;
  conversationManager: ConversationManager;
  plugin: SmartHolePlugin; // NEW: For loadData/saveData access
}
```

### Main Plugin Updates (`src/main.ts`)

Update MessageProcessor instantiation to pass plugin reference:
```typescript
this.messageProcessor = new MessageProcessor({
  connection: this.connection,
  inboxManager: this.inboxManager,
  app: this.app,
  settings: this.settings,
  conversationManager: this.conversationManager,
  plugin: this, // NEW: Pass plugin reference
});
```

### MessageProcessor Changes (`src/processor/MessageProcessor.ts`)

1. **Store plugin reference:**
```typescript
private plugin: SmartHolePlugin;

constructor(config: MessageProcessorConfig) {
  // ... existing assignments ...
  this.plugin = config.plugin;
}
```

2. **Add state storage:**
```typescript
/** Map of conversation ID to active conversation state */
private conversationStates: Map<string, ConversationState> = new Map();
```

3. **Persist state after processing:**
In `processWithRetry`, after LLM processing completes:

```typescript
// After getting response, check if waiting
const conversationState = llmService.getConversationState();

if (conversationState.isWaiting) {
  // Store pending state for this conversation
  const state: ConversationState = {
    isWaitingForResponse: true,
    pendingContext: {
      originalMessageId: messageId,
      toolCallsCompleted: conversationState.toolCalls,
      lastAgentMessage: conversationState.lastQuestion || '',
      createdAt: new Date().toISOString(),
    },
  };
  
  // ConversationManager.getActiveConversation() exists at line 57
  const conversationId = this.conversationManager.getActiveConversation()?.id;
  if (conversationId) {
    this.conversationStates.set(conversationId, state);
    await this.persistConversationStates();
  }
}

// Return with isWaitingForResponse flag
return {
  success: true,
  response: textContent,
  toolsUsed,
  isWaitingForResponse: conversationState.isWaiting,
};
```

4. **Restore context for follow-up messages:**
In `processWithRetry`, before LLM processing:

```typescript
// Check if this is a continuation of a pending conversation
const activeConversation = this.conversationManager.getActiveConversation();
if (activeConversation) {
  const pendingState = this.conversationStates.get(activeConversation.id);
  if (pendingState?.isWaitingForResponse) {
    // Restore LLM context
    llmService.restoreConversationState({
      isWaiting: false, // Clear since we're resuming
      lastQuestion: pendingState.pendingContext?.lastAgentMessage || null,
    });
    
    // Inject context into system prompt about the pending question
    const contextPrompt = this.buildContinuationContext(pendingState);
    llmService.setConversationContext(
      this.conversationManager.getContextPrompt() + '\n\n' + contextPrompt
    );
    
    // Clear the pending state since we're processing the response
    this.conversationStates.delete(activeConversation.id);
    await this.persistConversationStates();
  }
}
```

5. **Add context builder helper:**
```typescript
private buildContinuationContext(state: ConversationState): string {
  if (!state.pendingContext) return '';
  
  return `## Pending Context
You previously asked a question and are awaiting the user's response.
Your question was: "${state.pendingContext.lastAgentMessage}"
The message below is the user's response to your question. Continue the conversation accordingly.`;
}
```

6. **Add persistence methods:**
```typescript
private async persistConversationStates(): Promise<void> {
  const data = await this.plugin.loadData() || {};
  data.conversationStates = Object.fromEntries(this.conversationStates);
  await this.plugin.saveData(data);
}

async loadConversationStates(): Promise<void> {
  const data = await this.plugin.loadData();
  if (data?.conversationStates) {
    this.conversationStates = new Map(Object.entries(data.conversationStates));
  }
}
```

## Acceptance Criteria
- [ ] `MessageProcessorConfig` includes `plugin` reference
- [ ] `main.ts` passes `this` as plugin reference
- [ ] MessageProcessor stores plugin reference in constructor
- [ ] MessageProcessor persists conversation state when agent asks question
- [ ] Follow-up messages restore pending state context
- [ ] LLM receives context about the pending question
- [ ] State cleared after user responds
- [ ] `ProcessResult` includes `isWaitingForResponse` flag
- [ ] States persist to plugin data storage
- [ ] Existing MAX_TOOL_ITERATIONS = 10 safety limit remains unchanged