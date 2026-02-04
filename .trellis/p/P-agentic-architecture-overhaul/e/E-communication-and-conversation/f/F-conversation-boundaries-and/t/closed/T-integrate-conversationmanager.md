---
id: T-integrate-conversationmanager
title: Integrate ConversationManager with MessageProcessor
status: done
priority: high
parent: F-conversation-boundaries-and
prerequisites:
  - T-implement-conversationmanager
  - T-implement-conversation-1
affectedFiles:
  src/processor/types.ts: Replaced ConversationHistory import with
    ConversationManager; Changed conversationHistory property to
    conversationManager in MessageProcessorConfig interface
  src/processor/MessageProcessor.ts: Replaced ConversationHistory import with
    ConversationManager and ConversationMessage; Changed private member to
    conversationManager; Updated processWithRetry() to use
    conversationManager.getContextPrompt() and record messages as separate
    user/assistant ConversationMessage entries; Removed triggerSummarization
    method and needsSummarization check
  src/main.ts: Replaced ConversationHistory import with ConversationManager;
    Changed conversationHistory property to private conversationManager; Updated
    initialization to use ConversationManager; Updated MessageProcessor config;
    Added getConversationManager() accessor method
  src/views/ChatView.ts: Updated onOpen() to use plugin.getConversationManager()
    and load messages from active conversation using ConversationMessage format
log:
  - >-
    Research phase complete. Reviewed:

    - src/processor/types.ts - MessageProcessorConfig currently uses
    ConversationHistory

    - src/processor/MessageProcessor.ts - Uses
    conversationHistory.getContextPrompt(), addConversation(),
    needsSummarization(), summarizeOld()

    - src/main.ts - Initializes ConversationHistory and passes to
    MessageProcessor, exposes conversationHistory property

    - src/context/ConversationManager.ts - Has addMessage(), getContextPrompt(),
    getActiveConversation(), load(), endConversation()

    - src/views/ChatView.ts - Uses
    plugin.conversationHistory?.getRecentConversations() to load old
    HistoryEntry format

    - src/context/index.ts - Exports both ConversationHistory and
    ConversationManager


    Key findings:

    1. ChatView.onOpen() loads history using getRecentConversations() which
    returns HistoryEntry[]

    2. ConversationManager has different method signatures than
    ConversationHistory

    3. Need to update MessageProcessor to use ConversationMessage instead of
    HistoryEntry

    4. ChatView needs to be updated to work with ConversationManager's
    Conversation/ConversationMessage format
  - >-
    Integrated ConversationManager with MessageProcessor by replacing the old
    ConversationHistory integration:


    1. Updated MessageProcessorConfig in types.ts to use `conversationManager:
    ConversationManager` instead of `conversationHistory: ConversationHistory`


    2. Updated MessageProcessor:
       - Changed private member from `conversationHistory` to `conversationManager`
       - Updated `processWithRetry()` to use `conversationManager.getContextPrompt()`
       - Changed message recording to add user and assistant messages as separate `ConversationMessage` entries
       - Pass `llmService` to first `addMessage()` call to enable auto-summary generation on idle timeout
       - Removed the old `triggerSummarization()` method and needsSummarization check

    3. Updated main.ts plugin:
       - Changed import from ConversationHistory to ConversationManager
       - Replaced `conversationHistory` property with private `conversationManager`
       - Updated initialization to create ConversationManager and call load()
       - Updated MessageProcessor config to pass `conversationManager`
       - Added `getConversationManager()` accessor method for ChatView access
       - Updated onunload to clear conversationManager

    4. Updated ChatView:
       - Changed history loading to use `plugin.getConversationManager()` instead of `plugin.conversationHistory`
       - Now loads messages from the active conversation using `getActiveConversation().messages`
       - Adapted to work with ConversationMessage format instead of old HistoryEntry format
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