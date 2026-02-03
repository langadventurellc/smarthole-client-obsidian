---
id: T-implement-inboxmanager-class
title: Implement InboxManager class
status: open
priority: high
parent: F-inbox-manager-for-message
prerequisites:
  - T-create-inbox-module-type
affectedFiles: {}
log: []
schema: v1.0
childrenIds: []
created: 2026-02-03T14:55:10.750Z
updated: 2026-02-03T14:55:10.750Z
---

# Implement InboxManager class

## Purpose
Create the core `InboxManager` class that handles message durability by persisting incoming SmartHole messages to disk.

## Work Required

### Create `src/inbox/InboxManager.ts`

Implement the class with the following API:

```typescript
import { Vault } from 'obsidian';
import { RoutedMessage } from '../websocket/types';
import { InboxMessage } from './types';

const INBOX_PATH = '.smarthole/inbox';

export class InboxManager {
  constructor(private vault: Vault) {}

  /**
   * Save a message to the inbox folder.
   * Creates the inbox folder if it doesn't exist.
   * @returns The file path where the message was saved
   */
  async save(message: RoutedMessage): Promise<string>;

  /**
   * Delete a message from the inbox after successful processing.
   * Silently succeeds if the message doesn't exist.
   */
  async delete(messageId: string): Promise<void>;

  /**
   * List all pending (unprocessed) messages in the inbox.
   * Returns messages sorted by timestamp (oldest first).
   */
  async listPending(): Promise<InboxMessage[]>;

  /**
   * Get a specific message by ID.
   * Returns null if the message doesn't exist.
   */
  async get(messageId: string): Promise<InboxMessage | null>;
}
```

### Implementation Details

**Filename format:** `{timestamp}-{messageId}.md` where timestamp is ISO format with colons replaced (e.g., `2026-02-03T14-51-39.400Z-msg123.md`)

**File content format (frontmatter + body):**
```markdown
---
id: {messageId}
timestamp: {original message timestamp}
receivedAt: {ISO timestamp when saved}
metadata: {JSON stringified metadata}
---

{original message text}
```

**Key behaviors:**
- Use `vault.create()` for saving (creates parent folders automatically)
- Use `vault.delete()` for removal
- Use `vault.getFiles()` and filter by path prefix for listing
- Parse frontmatter using simple YAML parsing (or regex for MVP)
- Ensure inbox folder exists before first save using `vault.createFolder()`

## Acceptance Criteria
- [ ] `InboxManager` class created with all four methods
- [ ] `save()` creates inbox folder if needed, saves message with correct format
- [ ] `delete()` removes the file for a given message ID
- [ ] `listPending()` returns all messages sorted by timestamp
- [ ] `get()` retrieves a specific message or returns null
- [ ] Error handling for edge cases (missing files, parse errors)