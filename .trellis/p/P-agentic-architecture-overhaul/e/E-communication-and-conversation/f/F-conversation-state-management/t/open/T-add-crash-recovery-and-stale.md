---
id: T-add-crash-recovery-and-stale
title: Add crash recovery and stale state cleanup for conversation states
status: open
priority: high
parent: F-conversation-state-management
prerequisites:
  - T-implement-conversation-state
affectedFiles: {}
log: []
schema: v1.0
childrenIds: []
created: 2026-02-04T17:50:16.553Z
updated: 2026-02-04T17:50:16.553Z
---

# Crash Recovery and Stale State Cleanup

## Purpose
Ensure conversation states survive plugin restarts and clean up states that have been pending too long (user abandoned the conversation).

## Implementation

### Crash Recovery (`src/processor/MessageProcessor.ts`)

1. **Add initialize method to MessageProcessor:**
```typescript
async initialize(): Promise<void> {
  await this.loadConversationStates();
  await this.cleanupStaleStates();
}
```

2. **Implement loadConversationStates:**
```typescript
private async loadConversationStates(): Promise<void> {
  try {
    const data = await this.plugin.loadData();
    if (data?.conversationStates) {
      const states = data.conversationStates as Record<string, ConversationState>;
      this.conversationStates = new Map(Object.entries(states));
      console.log(`MessageProcessor: Loaded ${this.conversationStates.size} pending conversation state(s)`);
    }
  } catch (error) {
    console.error('MessageProcessor: Failed to load conversation states:', error);
    this.conversationStates = new Map();
  }
}
```

### Stale State Cleanup

1. **Add configurable timeout to settings (`src/settings.ts`):**
```typescript
/** Timeout in minutes for pending conversation states (default: 60) */
conversationStateTimeoutMinutes: number;
```

Also add to `DEFAULT_SETTINGS`:
```typescript
conversationStateTimeoutMinutes: 60,
```

2. **Implement cleanup method (public for periodic cleanup):**
```typescript
public async cleanupStaleStates(): Promise<void> {
  const timeoutMs = (this.settings.conversationStateTimeoutMinutes ?? 60) * 60 * 1000;
  const now = Date.now();
  let removed = 0;
  
  for (const [conversationId, state] of this.conversationStates) {
    if (state.pendingContext?.createdAt) {
      const createdAt = new Date(state.pendingContext.createdAt).getTime();
      if (now - createdAt > timeoutMs) {
        this.conversationStates.delete(conversationId);
        removed++;
      }
    }
  }
  
  if (removed > 0) {
    console.log(`MessageProcessor: Cleaned up ${removed} stale conversation state(s)`);
    await this.persistConversationStates();
  }
}
```

### Main Plugin Integration (`src/main.ts`)

**CRITICAL**: Update plugin onload to use async MessageProcessor initialization:

```typescript
// Current code (line 76-82):
this.messageProcessor = new MessageProcessor({
  connection: this.connection,
  inboxManager: this.inboxManager,
  app: this.app,
  settings: this.settings,
  conversationManager: this.conversationManager,
  plugin: this,
});

// ADD: Initialize MessageProcessor (load persisted states, cleanup stale)
await this.messageProcessor.initialize();

// THEN: Set up message handler and connect (existing code)
this.connection.onMessage = async (message) => {
  const result = await this.messageProcessor!.process(message);
  // ...
};
```

3. **Add periodic cleanup interval:**
```typescript
// In plugin onload, after messageProcessor.initialize()
this.registerInterval(
  window.setInterval(() => {
    this.messageProcessor?.cleanupStaleStates();
  }, 15 * 60 * 1000) // Every 15 minutes
);
```

### Settings UI (`src/settings.ts`)

Add settings field extraction in `extractSettings`:
```typescript
if (typeof d.conversationStateTimeoutMinutes === "number")
  settings.conversationStateTimeoutMinutes = d.conversationStateTimeoutMinutes;
```

Optionally add UI control in SmartHoleSettingTab (not required for MVP).

## Acceptance Criteria
- [ ] MessageProcessor has public `initialize()` method
- [ ] Conversation states load from plugin data on startup
- [ ] States that exceed timeout are automatically cleaned up
- [ ] `cleanupStaleStates()` is public for periodic cleanup access
- [ ] Cleanup runs on startup via `initialize()`
- [ ] Cleanup runs periodically (every 15 minutes) via `registerInterval`
- [ ] `main.ts` calls `await this.messageProcessor.initialize()` after construction
- [ ] Settings include `conversationStateTimeoutMinutes` (default 60 minutes)
- [ ] Corrupted/invalid states are handled gracefully (try/catch)
- [ ] Cleanup logging provides visibility into removed states