# Conversation History

Persistent conversation history management for LLM context continuity across plugin restarts.

## Initialization

```typescript
import { ConversationHistory } from "./context";

const history = new ConversationHistory({
  loadData: () => plugin.loadData(),
  saveData: (data) => plugin.saveData(data),
  maxConversations: 50,
});

await history.load();
```

## Storage

- Persisted in Obsidian plugin data (via `saveData()`)
- NOT stored as vault files (internal to plugin)
- Rolling window of recent conversations
- Older conversations summarized to preserve context

## Data Model

### History Entry

```typescript
interface HistoryEntry {
  id: string;                  // Unique conversation ID
  timestamp: string;           // ISO 8601 timestamp
  userMessage: string;         // Original user input
  assistantResponse: string;   // LLM's response
  toolsUsed: string[];         // Tools invoked
  source?: "websocket" | "direct";  // Message origin
}
```

### Conversation Summary

```typescript
interface ConversationSummary {
  id: string;
  createdAt: string;
  periodStart: string;         // Earliest conversation in batch
  periodEnd: string;           // Latest conversation in batch
  summary: string;             // LLM-generated summary
  conversationCount: number;   // Number of conversations summarized
}
```

### Persisted History

```typescript
interface PersistedHistory {
  recentConversations: HistoryEntry[];
  summaries: ConversationSummary[];
  lastSummarized: string | null;
}
```

## Usage

### Recording Conversations

```typescript
await history.addConversation({
  userMessage: "Create a note about today's meeting",
  assistantResponse: "I've created 'Meeting Notes.md' in your Journal folder.",
  toolsUsed: ["create_note"],
  source: "direct",
});
```

### Getting Context for LLM

```typescript
// Returns formatted context for system prompt
const contextPrompt = history.getContextPrompt();

// Includes:
// - Up to 10 recent conversations in full detail
// - Summaries of older conversations
```

### Retrieving Recent Conversations

```typescript
// Get last N conversations for UI display
const recent = history.getRecentConversations(20);
```

### Clearing History

```typescript
await history.clear();
```

## Context Injection

The `getContextPrompt()` method formats history for the LLM system prompt:

```
## Recent Conversation History

### 2 hours ago
User: Create a note about the meeting
Assistant: Created 'Meeting Notes.md' in Journal folder
Tools: create_note

### Yesterday
User: Find all notes about project X
Assistant: Found 3 notes: ...
Tools: search_notes

## Summary of Older Conversations
- User frequently creates notes in Journal folder
- Common topics: meetings, project updates, daily logs
```

## Summarization

Triggered when conversation count exceeds `maxConversations`:

1. Batch at least 10 oldest conversations
2. Send to LLM with summarization prompt
3. Store summary with period metadata
4. Remove summarized conversations from recent list

### Summarization Prompt

The LLM generates summaries capturing:
- Key topics discussed
- Files modified or created
- User patterns and preferences
- Important context for future conversations

## Configuration

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `maxConversations` | number | 50 | Max recent conversations before summarization |
| `loadData` | function | - | Plugin data loader |
| `saveData` | function | - | Plugin data saver |

## Implementation

Located in `src/context/`:
- `types.ts` - Data model interfaces
- `ConversationHistory.ts` - Main history manager
- `index.ts` - Public exports
