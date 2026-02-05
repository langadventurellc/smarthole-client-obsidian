---
id: T-add-clearall-method-to
title: Add clearAll() method to ConversationManager
status: done
priority: medium
parent: F-clear-conversation-history
prerequisites: []
affectedFiles:
  src/context/ConversationManager.ts: Added clearAll() method that resets
    conversations to empty array, sets activeConversationId to null, and
    persists the cleared state
log:
  - Added the `clearAll()` public method to the `ConversationManager` class. The
    method resets the `conversations` array to empty, sets
    `activeConversationId` to null, and persists the cleared state by calling
    the private `save()` method. The method includes a JSDoc comment explaining
    its purpose. The implementation follows the pattern established by the
    legacy `ConversationHistory.clear()` method and is placed after the
    `endConversation()` method (at line 122) among the other public methods.
schema: v1.0
childrenIds: []
created: 2026-02-05T06:08:30.150Z
updated: 2026-02-05T06:08:30.150Z
---

# Add clearAll() method to ConversationManager

Add a public method to `ConversationManager` that clears all conversation history and persists the empty state.

## Context

- **Feature**: [F-clear-conversation-history](/.trellis/f/F-clear-conversation-history/F-clear-conversation-history.md) - Clear Conversation History Button
- **File to modify**: `src/context/ConversationManager.ts`
- **Reference pattern**: The legacy `ConversationHistory` class has a `clear()` method at lines 123-126 in `src/context/ConversationHistory.ts` that demonstrates the pattern

## Implementation Requirements

Add a new public `async clearAll(): Promise<void>` method to the `ConversationManager` class that:

1. **Resets the `conversations` array to empty** - `this.conversations = []`
2. **Sets `activeConversationId` to null** - `this.activeConversationId = null`
3. **Persists the empty state** - Call `await this.save()` to write the cleared state to plugin storage

### Reference Pattern (from ConversationHistory.ts lines 123-126):
```typescript
async clear(): Promise<void> {
  this.history = this.createEmptyHistory();
  await this.save();
}
```

### Suggested Implementation:
```typescript
/**
 * Clear all conversation history.
 * Resets conversations to empty and persists the cleared state.
 */
async clearAll(): Promise<void> {
  this.conversations = [];
  this.activeConversationId = null;
  await this.save();
}
```

Place this method near the other public methods like `getActiveConversation()` and `endConversation()` (around line 95-120 area).

## Acceptance Criteria

- [ ] `clearAll()` method exists on `ConversationManager` class
- [ ] Method resets `conversations` array to empty `[]`
- [ ] Method sets `activeConversationId` to `null`
- [ ] Method calls `save()` to persist the cleared state
- [ ] Method is async and returns `Promise<void>`
- [ ] Method has JSDoc comment explaining its purpose

## Out of Scope

- UI elements (handled by separate task)
- Confirmation modal (handled by separate task)
- Exposing method through plugin interface (will be accessed via `this.plugin.getConversationManager()`)