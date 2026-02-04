# Conversation History

Persistent conversation management for LLM context continuity across plugin restarts. The system groups messages into discrete conversations bounded by idle timeouts or explicit endings.

## Overview

The context module provides two approaches:

1. **ConversationManager** (recommended) - Groups messages into discrete conversations with automatic boundary detection, LLM-generated summaries, and conversation lifecycle management.

2. **ConversationHistory** (legacy) - Flat list of conversation entries with periodic summarization. Retained for backward compatibility.

## ConversationManager

The recommended approach for managing conversation context. Conversations are bounded by:

- **Idle timeout**: After `conversationIdleTimeoutMinutes` of inactivity, the next message starts a new conversation
- **Explicit ending**: The agent can call the `end_conversation` tool to close the current conversation

### Initialization

```typescript
import { ConversationManager } from "./context";

const conversationManager = new ConversationManager(plugin);
await conversationManager.load();
```

### Data Model

#### Conversation Message

```typescript
interface ConversationMessage {
  id: string;           // Unique message ID
  timestamp: string;    // ISO 8601 timestamp
  role: "user" | "assistant";
  content: string;
  toolsUsed?: string[]; // Tools invoked (assistant only)
}
```

#### Conversation

```typescript
interface Conversation {
  id: string;           // e.g., "conv-1704067200000"
  startedAt: string;    // ISO 8601 timestamp
  endedAt: string | null;  // null if active
  title: string | null;    // LLM-generated title when ended
  summary: string | null;  // LLM-generated summary when ended
  messages: ConversationMessage[];
}
```

#### Persisted Format

```typescript
interface PersistedConversations {
  conversations: Conversation[];
  lastMigrated?: string;  // Set if migrated from old format
}
```

### Usage

#### Adding Messages

Messages are added to the active conversation. If no active conversation exists or the idle timeout has elapsed, a new one is created automatically.

```typescript
const message: ConversationMessage = {
  id: `msg-${Date.now()}`,
  timestamp: new Date().toISOString(),
  role: "user",
  content: "Create a note about today's meeting",
};

// LLM service optional - used for summary generation when closing previous conversation
const conversation = await conversationManager.addMessage(message, llmService);
```

#### Ending Conversations

Conversations can be ended explicitly, triggering summary generation:

```typescript
// With LLM service - generates title and summary
await conversationManager.endConversation(llmService);

// Without LLM service - closes without summary
await conversationManager.endConversation();
```

#### Getting Context for LLM

Returns formatted context from the active conversation for the system prompt:

```typescript
const contextPrompt = conversationManager.getContextPrompt();
// Returns:
// ## Current Conversation
// [2025-01-15T10:00:00Z]
// User: Create a note about today's meeting
//
// [2025-01-15T10:00:05Z]
// Assistant: I've created 'Meeting Notes.md' in your Journal folder. [used: write_file]
```

#### Retrieving Conversations

```typescript
// Get active conversation (if any)
const active = conversationManager.getActiveConversation();

// Get specific conversation by ID
const conv = conversationManager.getConversation("conv-1704067200000");

// Get recent ended conversations
const recent = conversationManager.getRecentConversations(10);
```

### Conversation Boundaries

#### Idle Timeout

When a message is added and more than `conversationIdleTimeoutMinutes` has elapsed since the last message:

1. The previous conversation is ended (summary generated if LLM available)
2. A new conversation is created
3. The message is added to the new conversation

#### Explicit Ending

The agent can use the `end_conversation` tool to explicitly close a conversation:

```json
{
  "name": "end_conversation",
  "input": {
    "reason": "task completed"
  }
}
```

This is useful when:
- A task is clearly complete
- The user indicates they're done
- The topic is changing significantly

### Summary Generation

When a conversation ends with an LLM service available, a summary is generated:

```typescript
const { title, summary } = await conversationManager.generateConversationSummary(
  conversationId,
  llmService
);
// title: "Meeting Notes Creation Request" (5-8 words)
// summary: "User requested creation of meeting notes. Created 'Meeting Notes.md' in Journal folder. Task completed successfully." (2-3 sentences)
```

### Rolling Limit

The system enforces `maxConversationsRetained` (default: 1000) by removing the oldest ended conversations when the limit is exceeded.

### Migration

Existing data in the old `HistoryEntry` format is automatically migrated:

1. All old entries are combined into a single "Migrated Conversation History" conversation
2. The old format data is deleted
3. A `lastMigrated` timestamp is recorded

## Configuration

| Setting | Type | Default | Description |
|---------|------|---------|-------------|
| `conversationIdleTimeoutMinutes` | number | 30 | Minutes of inactivity before a conversation ends |
| `maxConversationsRetained` | number | 1000 | Maximum conversations to keep (oldest deleted when exceeded) |
| `conversationStateTimeoutMinutes` | number | 60 | Minutes before a pending conversation state is considered stale |

### Conversation State vs Conversation History

- **Conversation History** (this document): Persistent record of completed message exchanges, organized into conversations with summaries
- **Conversation State**: Tracks *active* conversation flow, specifically whether the agent is waiting for a user response. See [Message Processor](message-processor.md#conversation-state-persistence) for details

## Storage

- Persisted in Obsidian plugin data (via `saveData()`)
- NOT stored as vault files (internal to plugin)
- Storage key: `conversationData`

## end_conversation Tool

The plugin provides an `end_conversation` tool that allows the agent to explicitly end conversations:

### Tool Definition

```typescript
{
  name: "end_conversation",
  description: "End the current conversation and generate a summary. Use this when a topic is concluded, the user indicates they're done, or when moving to an unrelated topic.",
  inputSchema: {
    type: "object",
    properties: {
      reason: {
        type: "string",
        description: "Optional reason for ending (e.g., 'task completed', 'user requested')"
      }
    },
    required: []
  }
}
```

### Registration

```typescript
import { createEndConversationTool } from "./llm/tools/endConversation";

const endConversationTool = createEndConversationTool({
  conversationManager,
  getLLMService: () => llmService,
});

llmService.registerTool(endConversationTool);
```

## get_conversation Tool

The plugin provides a `get_conversation` tool that allows the agent to retrieve past conversation details on demand:

### Tool Definition

```typescript
{
  name: "get_conversation",
  description: "Retrieve past conversation details. Use with conversation_id to get a specific conversation's full history, or use list_recent to get summaries of recent conversations. Only completed conversations are accessible (not the current active one).",
  inputSchema: {
    type: "object",
    properties: {
      conversation_id: {
        type: "string",
        description: "The ID of a specific conversation to retrieve. Returns full conversation history with all messages."
      },
      list_recent: {
        type: "number",
        description: "Number of recent conversations to list (summaries only, no full message content). Defaults to 10."
      }
    },
    required: []
  }
}
```

### Registration

```typescript
import { createGetConversationTool } from "./llm/tools/getConversation";

const getConversationTool = createGetConversationTool({
  conversationManager,
});

llmService.registerTool(getConversationTool);
```

### Response Formats

**Single conversation (when `conversation_id` provided):**
```typescript
{
  id: string;
  title: string | null;
  summary: string | null;
  startedAt: string;
  endedAt: string | null;
  messages: Array<{
    timestamp: string;
    role: "user" | "assistant";
    content: string;
    toolsUsed?: string[];
  }>;
}
```

**Conversation list (when `list_recent` provided or no parameters):**
```typescript
{
  conversations: Array<{
    id: string;
    title: string | null;
    summary: string | null;
    startedAt: string;
    endedAt: string | null;
    messageCount: number;
  }>;
}
```

### Use Cases

- Agent needs to reference something from a previous conversation
- User asks about what was discussed earlier
- Agent needs to find related context from past interactions
- Building continuity across conversation boundaries

## Legacy: ConversationHistory

The original flat history system is retained for backward compatibility but is no longer the recommended approach.

### Data Model

```typescript
interface HistoryEntry {
  id: string;
  timestamp: string;
  userMessage: string;
  assistantResponse: string;
  toolsUsed: string[];
  source?: "websocket" | "direct";
}

interface ConversationSummary {
  startDate: string;
  endDate: string;
  summary: string;
  conversationCount: number;
}

interface PersistedHistory {
  recentConversations: HistoryEntry[];
  summaries: ConversationSummary[];
  lastSummarized: string;
}
```

## Implementation

Located in `src/context/`:

- `types.ts` - All data model interfaces (legacy and new)
- `ConversationManager.ts` - Conversation lifecycle manager (recommended)
- `ConversationHistory.ts` - Legacy flat history manager
- `index.ts` - Public exports
