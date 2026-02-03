---
id: T-create-inbox-module-type
title: Create inbox module type definitions and exports
status: done
priority: high
parent: F-inbox-manager-for-message
prerequisites: []
affectedFiles:
  src/inbox/types.ts: Created inbox message type definitions with InboxMessage
    interface importing MessageMetadata from websocket types
  src/inbox/index.ts: Created module public exports file with InboxMessage type
    export and placeholder for InboxManager
log:
  - Created the inbox module type definitions and exports. The `InboxMessage`
    interface was defined with all required fields (id, timestamp, receivedAt,
    metadata, text, filePath) and imports `MessageMetadata` from the websocket
    types. The index.ts file exports the type and includes a placeholder comment
    for the InboxManager class that will be implemented in the next task. All
    quality checks (lint, format, type-check) pass.
schema: v1.0
childrenIds: []
created: 2026-02-03T14:55:00.300Z
updated: 2026-02-03T14:55:00.300Z
---

# Create inbox module type definitions and exports

## Purpose
Set up the `src/inbox/` module structure with type definitions for inbox messages.

## Work Required

### Create `src/inbox/types.ts`
Define the `InboxMessage` type that represents a parsed inbox message:
```typescript
export interface InboxMessage {
  /** Original message ID from SmartHole */
  id: string;
  /** ISO timestamp when message was originally created */
  timestamp: string;
  /** ISO timestamp when message was saved to inbox */
  receivedAt: string;
  /** Metadata from the original routed message */
  metadata: MessageMetadata;
  /** The original message text */
  text: string;
  /** File path in the vault */
  filePath: string;
}
```

Import `MessageMetadata` from `../websocket/types`.

### Create `src/inbox/index.ts`
Export:
- `InboxMessage` type from types
- `InboxManager` class (will be created in next task)

## Acceptance Criteria
- [ ] `src/inbox/types.ts` exists with `InboxMessage` interface
- [ ] `src/inbox/index.ts` exists with proper exports
- [ ] Types follow existing codebase patterns (JSDoc comments, type guards if needed)