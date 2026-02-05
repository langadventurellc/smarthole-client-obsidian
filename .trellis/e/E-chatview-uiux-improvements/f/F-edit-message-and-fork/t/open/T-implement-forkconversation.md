---
id: T-implement-forkconversation
title: Implement forkConversation method in ConversationManager
status: open
priority: high
parent: F-edit-message-and-fork
prerequisites:
  - T-add-conversationbranch-type
affectedFiles: {}
log: []
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