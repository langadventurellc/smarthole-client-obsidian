---
id: T-implement-forkconversation
title: Implement forkConversation method in ConversationManager
status: done
priority: high
parent: F-edit-message-and-fork
prerequisites:
  - T-add-conversationbranch-type
affectedFiles:
  src/context/ConversationManager.ts: "Added ConversationBranch import and
    implemented forkConversation(messageId: string) method (lines 133-177) that
    archives messages from a specified point into archivedBranches and truncates
    the active conversation."
log:
  - >-
    Research phase completed. Verified:

    - ConversationBranch type exists in src/context/types.ts (lines 73-82)

    - archivedBranches field exists in Conversation interface (lines 101-102)

    - ConversationManager.ts has all needed methods (getActiveConversation,
    save)

    - ConversationBranch is exported from src/context/index.ts


    Ready to implement forkConversation method.
  - >-
    Implemented the forkConversation method in ConversationManager that allows
    forking a conversation from a specific message point. The method:

    1. Finds the message index by messageId in the active conversation

    2. Creates a new ConversationBranch with messages from the fork point onward

    3. Adds the branch to the conversation's archivedBranches array (initializes
    if needed)

    4. Truncates the active messages array at the fork point

    5. Persists atomically via save()

    6. Returns the archived messages and fork point index


    The implementation includes proper error handling for cases where there is
    no active conversation or the message is not found. All quality checks pass
    (lint, format, type-check).
schema: v1.0
childrenIds: []
created: 2026-02-05T17:55:22.368Z
updated: 2026-02-05T17:55:22.368Z
---

Add the ability to fork a conversation from a specific message point, archiving messages from that point onward.

**Files to modify:**
- `src/context/ConversationManager.ts`

**Changes:**
1. Add `forkConversation(messageId: string)` method that:
   - Finds the message index in the active conversation
   - Creates a new ConversationBranch with messages from that index onward
   - Adds the branch to the conversation's archivedBranches array (initialize if needed)
   - Removes the archived messages from the active messages array
   - Persists the change via save()
   - Returns `{ archivedMessages: ConversationMessage[], forkPoint: number }`

2. The operation should be atomic - archive and remove in one save operation

**Example implementation signature:**
```typescript
async forkConversation(messageId: string): Promise<{ 
  archivedMessages: ConversationMessage[], 
  forkPoint: number 
}>
```

**Acceptance Criteria:**
- forkConversation method exists and can be called with a message ID
- Messages from the fork point onward are moved to archivedBranches
- Active conversation messages are truncated at the fork point
- Archived branches persist across plugin reload
- Returns the archived messages and fork point index