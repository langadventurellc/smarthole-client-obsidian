---
id: T-integrate-conversationmanager
title: Integrate ConversationManager with MessageProcessor
status: open
priority: high
parent: F-conversation-boundaries-and
prerequisites:
  - T-implement-conversationmanager
  - T-implement-conversation-1
affectedFiles: {}
log: []
schema: v1.0
childrenIds: []
created: 2026-02-04T17:12:09.031Z
updated: 2026-02-04T17:12:09.031Z
---

# Integrate ConversationManager with MessageProcessor

## Purpose

Replace the current `ConversationHistory` integration in `MessageProcessor` with the new `ConversationManager`, updating how messages are recorded and how context is provided to the LLM.

## Current State

`MessageProcessor` currently:
1. Stores a `conversationHistory: ConversationHistory` reference
2. Calls `conversationHistory.getContextPrompt()` to inject all history into LLM context
3. Calls `conversationHistory.addConversation()` after successful processing
4. Triggers `conversationHistory.summarizeOld()` when count exceeds limit

## Implementation

### Update MessageProcessor Constructor

Replace `ConversationHistory` with `ConversationManager`:

```typescript
// In MessageProcessorConfig (src/processor/types.ts)
interface MessageProcessorConfig {
  connection: SmartHoleConnection;
  inboxManager: InboxManager;
  app: App;
  settings: SmartHoleSettings;
  conversationManager: ConversationManager;  // Changed from conversationHistory
}

// In MessageProcessor
export class MessageProcessor {
  // ...
  private conversationManager: ConversationManager;  // Changed
  
  constructor(config: MessageProcessorConfig) {
    // ...
    this.conversationManager = config.conversationManager;  // Changed
  }
}
```

### Update processWithRetry Method

1. Replace context injection:
```typescript
// OLD:
llmService.setConversationContext(this.conversationHistory.getContextPrompt());

// NEW:
llmService.setConversationContext(this.conversationManager.getContextPrompt());
```

2. Replace conversation recording after successful processing:
```typescript
// OLD:
const historyEntry: HistoryEntry = {
  id: messageId,
  timestamp: new Date().toISOString(),
  userMessage: messageText,
  assistantResponse: textContent,
  toolsUsed,
  source,
};
await this.conversationHistory.addConversation(historyEntry);

// NEW:
// First add user message
const userMessage: ConversationMessage = {
  id: `${messageId}-user`,
  timestamp: new Date().toISOString(),
  role: 'user',
  content: messageText,
};
await this.conversationManager.addMessage(userMessage, llmService);

// Then add assistant response
const assistantMessage: ConversationMessage = {
  id: `${messageId}-assistant`,
  timestamp: new Date().toISOString(),
  role: 'assistant',
  content: textContent,
  toolsUsed,
};
await this.conversationManager.addMessage(assistantMessage);
```

3. Remove old summarization trigger:
```typescript
// REMOVE:
if (this.conversationHistory.needsSummarization()) {
  this.triggerSummarization().catch(...);
}
```

### Update main.ts Plugin Initialization

Replace `ConversationHistory` with `ConversationManager`:

```typescript
// In SmartHolePlugin class
private conversationManager: ConversationManager;

async onload() {
  // ...
  
  // Initialize ConversationManager instead of ConversationHistory
  this.conversationManager = new ConversationManager(this);
  await this.conversationManager.load();
  
  // Update MessageProcessor config
  this.messageProcessor = new MessageProcessor({
    connection: this.connection,
    inboxManager: this.inboxManager,
    app: this.app,
    settings: this.settings,
    conversationManager: this.conversationManager,  // Changed
  });
}
```

### Update ChatView (if it accesses history)

If `ChatView` directly accesses conversation history for display, update it to use `ConversationManager`:

```typescript
// In ChatView, update history display method
private displayConversationHistory(): void {
  const activeConversation = this.plugin.getConversationManager().getActiveConversation();
  if (activeConversation) {
    for (const message of activeConversation.messages) {
      this.addMessage(message.role, message.content);
    }
  }
}
```

### Add ConversationManager accessor to Plugin

```typescript
// In main.ts
getConversationManager(): ConversationManager {
  return this.conversationManager;
}
```

## Acceptance Criteria

- [ ] `MessageProcessorConfig` updated to use `ConversationManager`
- [ ] `MessageProcessor` uses `ConversationManager.getContextPrompt()` for LLM context
- [ ] User and assistant messages recorded as separate `ConversationMessage` entries
- [ ] `addMessage()` called with `llmService` for user message (enables auto-summary on idle)
- [ ] Old summarization logic removed from `MessageProcessor`
- [ ] Plugin initializes `ConversationManager` on load
- [ ] Plugin provides `getConversationManager()` accessor for other components
- [ ] `ChatView` updated if it accesses history directly

## Dependencies

- Requires T-implement-conversationmanager-core
- Requires T-implement-conversation-summary (for summary generation parameter)

## Technical Notes

- This is a breaking change in how context is injected - only current conversation appears in prompt
- The `F-get-conversation-tool` feature will provide access to past conversations
- Keep `ConversationHistory` class for now (migration task handles transition)
- Both user message and assistant response go into the same conversation