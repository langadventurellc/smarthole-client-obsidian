---
id: T-implement-conversation
title: Implement Conversation History Persistence
status: done
priority: medium
parent: F-conversation-history
prerequisites: []
affectedFiles:
  src/context/types.ts: Created type definitions for HistoryEntry,
    ConversationSummary, and PersistedHistory interfaces
  src/context/ConversationHistory.ts: Created main class with load,
    addConversation, getContextPrompt, clear, summarizeOld methods and
    persistence via plugin data
  src/context/index.ts: Created public exports for the context module
  src/settings.ts: Added maxConversationHistory to SmartHoleSettings interface,
    DEFAULT_SETTINGS, and settings UI
  src/main.ts: Added conversationHistory property, initialization on load, passing
    to MessageProcessor, cleanup on unload
  src/processor/types.ts: Added conversationHistory to MessageProcessorConfig
  src/processor/MessageProcessor.ts: Added conversation recording after successful
    processing, tools tracking, summarization triggering, and context passing to
    LLM
  src/llm/LLMService.ts: Added conversationContext property,
    setConversationContext() method, and context inclusion in system prompt
log:
  - >-
    Started implementation. Research phase complete:

    - Analyzed main.ts, settings.ts, types.ts to understand plugin structure

    - Studied LLMService.ts for conversation history patterns and system prompt
    building

    - Reviewed MessageProcessor.ts for message processing flow and LLMService
    integration

    - Examined InboxManager.ts for patterns of persistence without vault files

    - Verified module export patterns in inbox/index.ts, processor/index.ts,
    llm/index.ts


    Key findings:

    1. Plugin uses loadData/saveData for settings persistence

    2. LLMService already has conversationHistory (in-memory) that gets trimmed

    3. MessageProcessor creates fresh LLMService per message - will need to pass
    ConversationHistory

    4. LLMService.buildSystemPrompt() is where we'll inject historical context

    5. Module export pattern: types.ts for interfaces, Main.ts for class,
    index.ts for exports
  - >-
    Implementation complete. Summary of changes:


    1. Created src/context/ module:
       - types.ts: HistoryEntry, ConversationSummary, PersistedHistory interfaces
       - ConversationHistory.ts: Main class with load, addConversation, getContextPrompt, clear, summarizeOld
       - index.ts: Public exports

    2. Updated settings.ts:
       - Added maxConversationHistory to SmartHoleSettings interface
       - Added default value of 50 to DEFAULT_SETTINGS
       - Added "Conversation History Limit" setting UI

    3. Updated main.ts:
       - Added conversationHistory property
       - Initialize ConversationHistory on plugin load
       - Pass conversationHistory to MessageProcessor
       - Clean up on unload

    4. Updated processor/types.ts:
       - Added conversationHistory to MessageProcessorConfig

    5. Updated processor/MessageProcessor.ts:
       - Added conversationHistory property
       - Record conversations after successful LLM processing
       - Track tools used via extractToolsUsed()
       - Trigger async summarization when needed
       - Pass context to LLM via setConversationContext()

    6. Updated llm/LLMService.ts:
       - Added conversationContext property
       - Added setConversationContext() method
       - Include conversation context in buildSystemPrompt()

    All quality checks pass (lint, format, type-check).

    Build succeeds.
  - Implemented persistent conversation history system that stores conversations
    in plugin data across plugin restarts and provides summarization of older
    conversations to maintain context for the LLM. Created src/context/ module
    with ConversationHistory class, integrated with MessageProcessor to record
    conversations after successful LLM processing, and integrated with
    LLMService system prompt to include conversation context. Added
    maxConversationHistory setting (default 50) to control rolling window size.
schema: v1.0
childrenIds: []
created: 2026-02-03T17:22:49.499Z
updated: 2026-02-03T17:22:49.499Z
---

# Implement Conversation History Persistence

## Purpose

Create a persistent conversation history system that stores conversations in plugin data across plugin restarts and provides summarization of older conversations to maintain context for the LLM.

## Scope

### Create Context Module

Create `src/context/` directory with:
- `types.ts` - Type definitions for HistoryEntry, ConversationSummary, PersistedHistory
- `ConversationHistory.ts` - Main class for managing persistent history
- `index.ts` - Public exports

### ConversationHistory Class

Implement `ConversationHistory` class with:

1. **Constructor**: Accept plugin reference for data persistence
2. **load()**: Load history from plugin data on startup
3. **addConversation(entry: HistoryEntry)**: Add a completed conversation
4. **getContextPrompt()**: Return formatted context for LLM (recent conversations + summaries)
5. **clear()**: Clear all history
6. **summarizeOld(llmService: LLMService)**: Generate summary for old conversations using LLM

### Data Model

```typescript
interface HistoryEntry {
  id: string;           // Unique conversation ID
  timestamp: string;    // ISO timestamp
  userMessage: string;  // Original user request
  assistantResponse: string; // Final LLM response (text only)
  toolsUsed: string[];  // Names of tools invoked
}

interface ConversationSummary {
  startDate: string;    // When the summarized period began
  endDate: string;      // When it ended
  summary: string;      // LLM-generated summary of conversations
  conversationCount: number;
}

interface PersistedHistory {
  recentConversations: HistoryEntry[];  // Last N full conversations
  summaries: ConversationSummary[];     // Summarized older conversations
  lastSummarized: string;               // Timestamp of last summary
}
```

### Configuration

- Default rolling window: 50 conversations (configurable via settings)
- Add `maxConversationHistory` setting to SmartHoleSettings
- Automatic summarization when conversations exceed the limit

### Integration

1. **MessageProcessor Integration**: After successful LLM processing, call `conversationHistory.addConversation()` with the conversation details
2. **LLMService Integration**: Modify `buildSystemPrompt()` to include context from `ConversationHistory.getContextPrompt()`
3. **Plugin Startup**: Load history on plugin load
4. **Settings**: Add optional setting for history window size

### Storage

- Use `plugin.saveData()` with a dedicated key for conversation history (extend plugin data structure)
- Load on plugin startup via `plugin.loadData()`
- Never write to vault files (keeps history private)

## Acceptance Criteria

- [ ] `src/context/` directory created with types.ts, ConversationHistory.ts, index.ts
- [ ] HistoryEntry, ConversationSummary, PersistedHistory interfaces defined
- [ ] ConversationHistory class implements load, addConversation, getContextPrompt, clear, summarizeOld
- [ ] History persisted in plugin data (survives plugin restart)
- [ ] Rolling window keeps last N conversations (default 50)
- [ ] Old conversations summarized before removal
- [ ] getContextPrompt() returns formatted context including recent conversations and summaries
- [ ] Integration with MessageProcessor to record conversations
- [ ] Integration with LLMService system prompt to include conversation context
- [ ] maxConversationHistory setting added (optional)

## Technical Notes

- Plugin data is accessed via `plugin.loadData()` and `plugin.saveData()`
- MessageProcessor currently creates fresh LLMService for each message - history should be shared
- Consider making ConversationHistory a property of the main plugin class, passed to MessageProcessor