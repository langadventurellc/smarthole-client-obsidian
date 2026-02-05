---
id: T-add-conversationbranch-type
title: Add ConversationBranch type and archivedBranches field to data model
status: done
priority: high
parent: F-edit-message-and-fork
prerequisites: []
affectedFiles:
  src/context/types.ts: Added ConversationBranch interface (lines 73-82) with
    messages array and archivedAt timestamp. Added archivedBranches optional
    field to Conversation interface (line 101-102).
  src/context/index.ts: Added ConversationBranch to the type exports (line 13).
log:
  - Added ConversationBranch type and archivedBranches field to support
    conversation forking. The ConversationBranch interface stores an array of
    messages with an archivedAt timestamp, and the Conversation interface now
    has an optional archivedBranches field to store forked conversation
    branches. The new type is also exported from the context module index.
schema: v1.0
childrenIds: []
created: 2026-02-05T17:55:16.214Z
updated: 2026-02-05T17:55:16.214Z
---

Add the necessary type definitions to support conversation forking:

**Files to modify:**
- `src/context/types.ts`

**Changes:**
1. Add `ConversationBranch` interface:
   ```typescript
   export interface ConversationBranch {
     messages: ConversationMessage[];
     archivedAt: string;
   }
   ```

2. Add `archivedBranches` field to `Conversation` interface:
   ```typescript
   // In Conversation interface, add:
   archivedBranches?: ConversationBranch[];
   ```

**Acceptance Criteria:**
- ConversationBranch type exists with messages array and archivedAt timestamp
- Conversation type has optional archivedBranches array field
- TypeScript compiles without errors