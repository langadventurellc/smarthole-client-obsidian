---
id: T-add-conversation-data-types
title: Add Conversation Data Types and Settings
status: done
priority: high
parent: F-conversation-boundaries-and
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
log:
  - "Added new conversation-based data types and settings for the conversation
    lifecycle feature. Created ConversationMessage interface for individual
    messages within a conversation, Conversation interface for discrete
    conversation sessions (with id, timestamps, title, summary, and messages
    array), and PersistedConversations interface for the storage format. Added
    two new settings: conversationIdleTimeoutMinutes (default 30) and
    maxConversationsRetained (default 1000), with corresponding UI controls in
    the settings tab. All existing types (HistoryEntry, ConversationSummary,
    PersistedHistory) are preserved for backward compatibility during
    migration."
schema: v1.0
childrenIds: []
created: 2026-02-04T17:11:11.382Z
updated: 2026-02-04T17:11:11.382Z
---

# Add Conversation Data Types and Settings

## Purpose

Define the core data model for conversation-based history and add the required settings fields for conversation lifecycle configuration.

## Implementation

### Data Types (`src/context/types.ts`)

Add new interfaces for the conversation-based data model:

```typescript
interface Conversation {
  id: string;                    // Unique conversation ID (e.g., "conv-{timestamp}" or UUID)
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

// Storage format for persistence
interface PersistedConversations {
  conversations: Conversation[];
  lastMigrated?: string;  // ISO timestamp when migrated from old format
}
```

### Settings (`src/settings.ts`)

Add new settings to `SmartHoleSettings` interface:

```typescript
interface SmartHoleSettings {
  // ... existing
  conversationIdleTimeoutMinutes: number;  // Default: 30
  maxConversationsRetained: number;        // Default: 1000
}
```

Add defaults in `DEFAULT_SETTINGS`:
- `conversationIdleTimeoutMinutes: 30`
- `maxConversationsRetained: 1000`

### Settings UI (`src/settings.ts`)

Add settings UI in `SmartHoleSettingTab.display()`:
- "Conversation Idle Timeout (minutes)" - numeric input with placeholder "30"
- "Max Conversations Retained" - numeric input with placeholder "1000"

## Acceptance Criteria

- [ ] `Conversation` and `ConversationMessage` interfaces defined in `src/context/types.ts`
- [ ] `PersistedConversations` interface defined for storage format
- [ ] Settings interface updated with new fields
- [ ] Default values set for new settings
- [ ] Settings UI added for both new settings with appropriate descriptions
- [ ] Exported from `src/context/index.ts`

## Technical Notes

- Keep existing `HistoryEntry`, `ConversationSummary`, `PersistedHistory` interfaces for backward compatibility during migration
- New interfaces should be exported from `src/context/types.ts` and re-exported from `src/context/index.ts`
- Settings should validate for reasonable ranges (timeout > 0, max conversations >= 1)