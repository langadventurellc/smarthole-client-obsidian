---
id: F-conversation-history
title: Conversation History Persistence and IA Description Generation
status: done
priority: medium
parent: E-message-processing-pipeline
prerequisites:
  - F-message-processor-orchestratio
affectedFiles:
  src/context/types.ts: Created type definitions for HistoryEntry,
    ConversationSummary, and PersistedHistory interfaces
  src/context/ConversationHistory.ts: Created main class with load,
    addConversation, getContextPrompt, clear, summarizeOld methods and
    persistence via plugin data
  src/context/index.ts: Created public exports for the context module
  src/settings.ts: "Added maxConversationHistory to SmartHoleSettings interface,
    DEFAULT_SETTINGS, and settings UI; Added imports for LLMService, LLMError,
    and extractTextContent from ./llm module. Replaced the placeholder Generate
    button onClick handler with full implementation: validation for API key and
    IA text, loading state management, LLM service initialization and message
    processing, settings update and save, UI refresh, and inline status display
    for success/error feedback."
  src/main.ts: Added conversationHistory property, initialization on load, passing
    to MessageProcessor, cleanup on unload
  src/processor/types.ts: Added conversationHistory to MessageProcessorConfig
  src/processor/MessageProcessor.ts: Added conversation recording after successful
    processing, tools tracking, summarization triggering, and context passing to
    LLM
  src/llm/LLMService.ts: Added conversationContext property,
    setConversationContext() method, and context inclusion in system prompt
log:
  - "Auto-completed: All child tasks are complete"
schema: v1.0
childrenIds:
  - T-implement-conversation
  - T-implement-generate-description
created: 2026-02-03T14:52:17.138Z
updated: 2026-02-03T14:52:17.138Z
---

# Conversation History Persistence and IA Description Generation

## Purpose

Enhance the LLM interaction by persisting conversation history across plugin restarts and implementing the "Generate Description from IA" feature that helps users create effective routing descriptions.

## Scope

### In Scope

#### Conversation History Persistence
- Create `src/context/ConversationHistory.ts` class
- Store conversation history in plugin data (via `saveData()`), NOT in vault files
- Implement rolling window of last N conversations (configurable, default 50)
- Generate summaries for older conversations that get rotated out
- Provide context to LLM including recent conversations and summaries
- Clear old history automatically based on age or count
- Integrate with LLMService for seamless context injection

#### Generate Description from IA
- Implement the "Generate" button functionality in settings
- Use LLM to analyze the Information Architecture text
- Generate a concise, effective routing description
- Update the routing description field with the generated text
- Show notification with result

### Out of Scope
- Real-time search of conversation history
- Vector/semantic search
- Message processing flow (separate feature)
- Inbox management (separate feature)

## Technical Details

### File Structure
```
src/context/
├── ConversationHistory.ts  # Persistence and retrieval
├── types.ts                # HistoryEntry, ConversationSummary types
└── index.ts                # Public exports
```

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

### API Design
```typescript
class ConversationHistory {
  constructor(plugin: SmartHolePlugin);
  
  // Add a completed conversation
  async addConversation(entry: HistoryEntry): Promise<void>;
  
  // Get context for LLM (recent + summaries)
  getContextPrompt(): string;
  
  // Clear all history
  async clear(): Promise<void>;
  
  // Force summarization of old conversations
  async summarizeOld(llmService: LLMService): Promise<void>;
}
```

### Storage
- Stored in plugin data via `this.plugin.saveData()`
- Loaded on plugin startup via `this.plugin.loadData()`
- Never written to vault files (keeps history private/hidden)

### Generate Description Flow
1. User clicks "Generate" button in settings
2. Initialize LLMService with API key
3. Send Information Architecture to LLM with prompt asking for routing description
4. Receive generated description
5. Update `routingDescription` setting
6. Save settings
7. Refresh settings UI to show new value
8. Show success notification (or error if failed)

## Acceptance Criteria

### Conversation History
- [ ] `ConversationHistory` class created in `src/context/`
- [ ] History stored in plugin data, not vault files
- [ ] Rolling window keeps last 50 conversations (configurable)
- [ ] Old conversations summarized before removal
- [ ] `getContextPrompt()` returns formatted context for LLM
- [ ] History persists across plugin restarts
- [ ] History cleared with `clear()` method
- [ ] Integration with LLMService system prompt

### Generate Description
- [ ] "Generate" button in settings calls LLM
- [ ] LLM analyzes Information Architecture text
- [ ] Generated description is concise and effective for routing
- [ ] Routing description field updated with generated text
- [ ] Settings saved automatically after generation
- [ ] Success/error notification shown to user
- [ ] Handles missing API key gracefully

## Dependencies

- **F-message-processor-orchestration**: Conversation history integrates with message processing flow