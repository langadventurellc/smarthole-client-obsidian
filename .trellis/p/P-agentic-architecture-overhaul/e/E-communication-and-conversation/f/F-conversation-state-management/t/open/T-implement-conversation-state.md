---
id: T-implement-conversation-state
title: Implement conversation state persistence in MessageProcessor
status: open
priority: high
parent: F-conversation-state-management
prerequisites:
  - T-add-conversationstate-types
  - T-extend-llmservice-to-track
affectedFiles: {}
log: []
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