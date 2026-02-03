---
id: T-implement-inboxmanager-class
title: Implement InboxManager class
status: done
priority: high
parent: F-inbox-manager-for-message
prerequisites:
  - T-create-inbox-module-type
affectedFiles:
  src/inbox/InboxManager.ts: Created InboxManager class with save, delete,
    listPending, and get methods for message durability
  src/inbox/index.ts: Updated exports to include InboxManager class
log:
  - >-
    Started implementation. Completed research phase:

    - Verified inbox types exist with InboxMessage interface

    - Studied existing patterns in createNote.ts and searchNotes.ts for vault
    operations

    - Identified folder creation pattern using vault.createFolder() and
    getFolderByPath()

    - Planning to implement all four methods: save, delete, listPending, get
  - >-
    Implemented the InboxManager class with all four required methods:


    1. `save(message: RoutedMessage)` - Saves messages to `.smarthole/inbox/`
    folder with YAML frontmatter format. Creates inbox folder hierarchy if
    needed. Returns the file path where the message was saved.


    2. `delete(messageId: string)` - Removes inbox file by message ID. Silently
    succeeds if message doesn't exist.


    3. `listPending()` - Lists all unprocessed messages in the inbox, sorted by
    timestamp (oldest first). Parses YAML frontmatter to reconstruct
    InboxMessage objects.


    4. `get(messageId: string)` - Retrieves a specific message by ID, returning
    null if not found.


    Key implementation details:

    - Filename format: `{timestamp}-{messageId}.md` with colons replaced in
    timestamp

    - Content format: YAML frontmatter with id, timestamp, receivedAt, metadata
    fields + body with message text

    - Uses Obsidian's Vault API: create(), delete(), read(), getFiles(),
    createFolder(), getFolderByPath()

    - Regex-based frontmatter parsing for MVP (simple and reliable)

    - Proper error handling with null returns for parse failures


    All quality checks pass (lint, format, type-check).
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