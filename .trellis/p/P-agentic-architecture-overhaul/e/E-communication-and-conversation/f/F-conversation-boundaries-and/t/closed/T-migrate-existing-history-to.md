---
id: T-migrate-existing-history-to
title: Migrate Existing History to Conversations
status: done
priority: medium
parent: F-conversation-boundaries-and
prerequisites:
  - T-add-conversation-data-types
  - T-implement-conversationmanager
affectedFiles:
  src/context/ConversationManager.ts: "Added migration logic: imported old format
    types (PersistedHistory, HistoryEntry, ConversationSummary), added
    HISTORY_DATA_KEY constant, updated load() to check for old format and run
    migration, added migrateFromOldFormat(), convertOldEntriesToMessages(),
    buildMigrationSummary(), toPersistedFormat(), and
    loadFromPersistedConversations() methods"
log:
  - >-
    Implemented migration logic in ConversationManager to preserve existing
    ConversationHistory data when upgrading to the new conversation-based
    system. The migration:

    1. Updated load() to check for new format first (key: "conversationData"),
    then check for old format (key: "conversationHistory") and run migration if
    found

    2. Added migrateFromOldFormat() that creates a single completed conversation
    from all old HistoryEntry items

    3. Added convertOldEntriesToMessages() to convert HistoryEntry items to
    ConversationMessage pairs (user + assistant)

    4. Added buildMigrationSummary() to preserve old summaries in the migrated
    conversation's summary text

    5. Added toPersistedFormat() and loadFromPersistedConversations() helper
    methods

    6. Migration sets lastMigrated timestamp, clears old conversationHistory
    key, and logs to console
schema: v1.0
childrenIds: []
created: 2026-02-04T17:12:30.351Z
updated: 2026-02-04T17:12:30.351Z
---

# Migrate Existing History to Conversations

## Purpose

Preserve existing `ConversationHistory` data when upgrading to the new `ConversationManager` system. Treat all existing history as one completed conversation with a generated summary.

## Implementation

### Migration Logic in ConversationManager.load()

Add migration check and execution:

```typescript
async load(): Promise<void> {
  const data = await this.plugin.loadData();
  
  // Check for existing new-format data
  if (data?.conversationData) {
    this.loadFromPersistedConversations(data.conversationData);
    return;
  }
  
  // Check for old-format data that needs migration
  if (data?.conversationHistory) {
    await this.migrateFromOldFormat(data.conversationHistory);
    return;
  }
  
  // No existing data - start fresh
  this.conversations = [];
  this.activeConversationId = null;
}
```

### Migration Implementation

```typescript
private async migrateFromOldFormat(oldHistory: PersistedHistory): Promise<void> {
  console.log("ConversationManager: Migrating from old conversation history format");
  
  const recentConversations = oldHistory.recentConversations || [];
  const summaries = oldHistory.summaries || [];
  
  if (recentConversations.length === 0 && summaries.length === 0) {
    // Nothing to migrate
    this.conversations = [];
    this.activeConversationId = null;
    await this.save();
    return;
  }
  
  // Create a single completed conversation from all old entries
  const migratedConversation: Conversation = {
    id: `conv-migrated-${Date.now()}`,
    startedAt: recentConversations[0]?.timestamp || new Date().toISOString(),
    endedAt: new Date().toISOString(),
    title: "Migrated Conversation History",
    summary: this.buildMigrationSummary(recentConversations, summaries),
    messages: this.convertOldEntriesToMessages(recentConversations),
  };
  
  this.conversations = [migratedConversation];
  this.activeConversationId = null;
  
  // Save in new format
  await this.save();
  
  // Clear old format data
  const data = await this.plugin.loadData() || {};
  delete data.conversationHistory;
  data.conversationData = this.toPersistedFormat();
  data.conversationData.lastMigrated = new Date().toISOString();
  await this.plugin.saveData(data);
  
  console.log(`ConversationManager: Migrated ${recentConversations.length} entries to new format`);
}

private convertOldEntriesToMessages(entries: HistoryEntry[]): ConversationMessage[] {
  const messages: ConversationMessage[] = [];
  
  for (const entry of entries) {
    // Add user message
    messages.push({
      id: `${entry.id}-user`,
      timestamp: entry.timestamp,
      role: 'user',
      content: entry.userMessage,
    });
    
    // Add assistant response
    messages.push({
      id: `${entry.id}-assistant`,
      timestamp: entry.timestamp,
      role: 'assistant',
      content: entry.assistantResponse,
      toolsUsed: entry.toolsUsed,
    });
  }
  
  return messages;
}

private buildMigrationSummary(
  entries: HistoryEntry[], 
  oldSummaries: ConversationSummary[]
): string {
  const parts: string[] = [];
  
  if (oldSummaries.length > 0) {
    parts.push("Historical summaries:");
    for (const summary of oldSummaries) {
      parts.push(`- ${summary.startDate} to ${summary.endDate} (${summary.conversationCount} conversations): ${summary.summary}`);
    }
  }
  
  if (entries.length > 0) {
    parts.push(`\nMigrated ${entries.length} recent conversations from previous format.`);
    
    // Extract unique tools used
    const allTools = new Set<string>();
    for (const entry of entries) {
      for (const tool of entry.toolsUsed) {
        allTools.add(tool);
      }
    }
    if (allTools.size > 0) {
      parts.push(`Tools used: ${Array.from(allTools).join(", ")}`);
    }
  }
  
  return parts.join("\n") || "Migrated from legacy conversation history format.";
}
```

### Persistence Helper

```typescript
private toPersistedFormat(): PersistedConversations {
  return {
    conversations: this.conversations,
  };
}

private loadFromPersistedConversations(data: PersistedConversations): void {
  this.conversations = data.conversations || [];
  // Find active conversation (one without endedAt)
  const active = this.conversations.find(c => c.endedAt === null);
  this.activeConversationId = active?.id || null;
}
```

## Acceptance Criteria

- [ ] Migration runs automatically on first load with old-format data
- [ ] All `HistoryEntry` items converted to `ConversationMessage` pairs (user + assistant)
- [ ] Old summaries preserved in migrated conversation summary text
- [ ] Migrated conversation marked as ended with timestamp
- [ ] Old `conversationHistory` key removed from plugin data after migration
- [ ] New `conversationData` key used for persistence
- [ ] `lastMigrated` timestamp recorded
- [ ] Migration only runs once (subsequent loads use new format)
- [ ] Console log indicates migration occurred

## Dependencies

- Requires T-add-conversation-data-types
- Requires T-implement-conversationmanager-core

## Technical Notes

- Migration is one-way (old format → new format)
- All old history becomes a single completed conversation (not multiple)
- This provides a clean starting point for the new system
- Users lose granular access to individual old conversations, but the content is preserved
- Consider: if old history is very large, the migrated conversation will have many messages