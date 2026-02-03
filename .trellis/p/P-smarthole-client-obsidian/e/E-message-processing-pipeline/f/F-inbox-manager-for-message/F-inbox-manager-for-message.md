---
id: F-inbox-manager-for-message
title: Inbox Manager for Message Durability
status: open
priority: high
parent: E-message-processing-pipeline
prerequisites: []
affectedFiles: {}
log: []
schema: v1.0
childrenIds: []
created: 2026-02-03T14:51:39.400Z
updated: 2026-02-03T14:51:39.400Z
---

# Inbox Manager for Message Durability

## Purpose

Implement a message durability layer that persists incoming SmartHole messages to disk before processing, ensuring no messages are lost if processing fails or the plugin crashes.

## Scope

### In Scope
- Create `src/inbox/InboxManager.ts` class
- Save incoming messages to `.smarthole/inbox/` folder in the vault
- Use ISO timestamp format for filenames: `{timestamp}-{messageId}.md`
- Include original message text, metadata, and timestamp in saved file
- Provide method to delete messages after successful processing
- Provide method to list pending (unprocessed) messages
- Provide method to reprocess a pending message
- Create the inbox folder on first use if it doesn't exist

### Out of Scope
- Message processing logic (handled by Message Processor feature)
- LLM integration
- SmartHole response sending

## Technical Details

### File Structure
```
src/inbox/
├── InboxManager.ts    # Main class
├── types.ts           # InboxMessage type definitions
└── index.ts           # Public exports
```

### InboxMessage Format
```markdown
---
id: {messageId}
timestamp: {ISO timestamp}
receivedAt: {ISO timestamp when saved}
metadata: {JSON stringified metadata}
---

{original message text}
```

### API Design
```typescript
class InboxManager {
  constructor(vault: Vault);
  
  // Save a message immediately on receipt (before ack)
  async save(message: RoutedMessage): Promise<string>; // returns filepath
  
  // Delete after successful processing
  async delete(messageId: string): Promise<void>;
  
  // List pending messages (for reprocessing on startup)
  async listPending(): Promise<InboxMessage[]>;
  
  // Get a specific message by ID
  async get(messageId: string): Promise<InboxMessage | null>;
}
```

## Acceptance Criteria

- [ ] `InboxManager` class created in `src/inbox/`
- [ ] Messages saved to `.smarthole/inbox/` with correct filename format
- [ ] Message content includes original text, metadata, and timestamps
- [ ] `save()` completes successfully before any other processing
- [ ] `delete()` removes the inbox file for a message
- [ ] `listPending()` returns all unprocessed messages sorted by timestamp
- [ ] `get()` retrieves a specific message by ID
- [ ] Inbox folder created automatically if it doesn't exist
- [ ] Failed messages remain in inbox (not auto-deleted)

## Dependencies

None - this is a standalone utility class.