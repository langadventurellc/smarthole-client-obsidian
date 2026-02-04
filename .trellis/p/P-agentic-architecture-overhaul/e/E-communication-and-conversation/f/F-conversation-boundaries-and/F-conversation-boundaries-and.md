---
id: F-conversation-boundaries-and
title: Conversation Boundaries and Lifecycle
status: in-progress
priority: medium
parent: E-communication-and-conversation
prerequisites: []
affectedFiles:
  src/context/types.ts: Added ConversationMessage, Conversation, and
    PersistedConversations interfaces for the new conversation-based data model
  src/context/index.ts: Added exports for new types (Conversation,
    ConversationMessage, PersistedConversations) while keeping legacy type
    exports
  src/settings.ts: Added conversationIdleTimeoutMinutes and
    maxConversationsRetained to SmartHoleSettings interface and
    DEFAULT_SETTINGS, plus UI controls in SmartHoleSettingTab.display()
log: []
schema: v1.0
childrenIds:
  - T-add-conversation-data-types
  - T-add-end-conversation-tool
  - T-implement-conversation-1
  - T-implement-conversationmanager
  - T-integrate-conversationmanager
  - T-migrate-existing-history-to
created: 2026-02-04T06:03:55.794Z
updated: 2026-02-04T06:03:55.794Z
---

# Conversation Boundaries and Lifecycle

## Purpose

Group message exchanges into discrete conversations based on time proximity and explicit endings. Generate summaries when conversations end to enable efficient context retrieval.

## Current State

- ConversationHistory stores all messages as flat list
- No concept of conversation boundaries
- All historical context included in system prompt (can get large)
- Summarization happens when count exceeds limit, not at logical boundaries

## Implementation

### ConversationManager (`src/context/ConversationManager.ts`)

New class that manages conversation lifecycle, separate from ConversationHistory.

**Conversation lifecycle:**
- New conversation starts when:
  - No active conversation exists
  - Idle timeout exceeded since last message
  - Previous conversation explicitly ended
- Conversation ends when:
  - Agent explicitly ends it (via special tool call or response signal)
  - User requests agent to end it ("end conversation", "that's all", etc.)
  - Idle timeout triggers on next message arrival

**Configuration:**
- Idle timeout: configurable in settings (default: 30 minutes)
- Rolling limit: 1000 conversations retained (configurable)
- Oldest conversations deleted when limit exceeded

### Data Model (`src/context/types.ts`)

```typescript
interface Conversation {
  id: string;                    // Unique conversation ID
  startedAt: string;             // ISO 8601 timestamp
  endedAt: string | null;        // null if active
  title: string | null;          // Auto-generated title (null until ended)
  summary: string | null;        // Auto-generated summary (null until ended)
  messages: ConversationMessage[];
}

interface ConversationMessage {
  id: string;
  timestamp: string;
  role: 'user' | 'assistant';
  content: string;
  toolsUsed?: string[];
}
```

### Summary Generation

- Generate summary immediately when conversation ends
- Use user's configured model (from settings)
- Generate both title (short) and summary (detailed)
- Summary includes: topics discussed, actions taken, outcomes

### Context Injection Changes

- Only current conversation's messages included in LLM context
- Past conversations NOT in system prompt (reduces token usage)
- Agent retrieves past conversations via `get_conversation` tool when needed
- This is a breaking change from current behavior (all history in prompt)

### Settings Additions

```typescript
interface SmartHoleSettings {
  // ... existing
  conversationIdleTimeoutMinutes: number;  // Default: 30
  maxConversationsRetained: number;        // Default: 1000
}
```

## Acceptance Criteria

- [ ] Messages within idle timeout belong to same conversation
- [ ] Idle timeout is configurable (setting in plugin settings)
- [ ] Agent can explicitly end a conversation
- [ ] User can request agent to end conversation
- [ ] Summary generated immediately when conversation ends
- [ ] Summary uses user's configured model
- [ ] New conversations start silently (no notification to user)
- [ ] Rolling limit of conversations retained (configurable)
- [ ] Oldest conversations deleted when limit exceeded
- [ ] Only current conversation in LLM system prompt
- [ ] Past conversations accessible only via tool (get_conversation)

## Migration

- Existing ConversationHistory data should be preserved
- On first load with new system, treat existing history as one completed conversation
- Generate summary for migrated data

## Technical Notes

- ConversationManager wraps/replaces ConversationHistory
- Need to coordinate with MessageProcessor for conversation boundary detection
- Consider conversation ID format: `conv-{timestamp}` or UUID