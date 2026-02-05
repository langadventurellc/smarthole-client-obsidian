---
id: T-implement-fork-on-send-logic
title: Implement fork-on-send logic when editing messages
status: open
priority: medium
parent: F-edit-message-and-fork
prerequisites:
  - T-implement-forkconversation
  - T-implement-edit-mode-state-and
  - T-add-footer-action-bar-with
affectedFiles: {}
log: []
schema: v1.0
childrenIds: []
created: 2026-02-05T17:55:49.911Z
updated: 2026-02-05T17:55:49.911Z
---

When sending a message while in edit mode, fork the conversation and process the edited message with correct context.

**Files to modify:**
- `src/views/ChatView.ts`

**Changes to handleSend and onSendCallback:**
1. Modify the send callback logic to detect edit mode:
   ```typescript
   if (this.editingMessageId) {
     // Fork the conversation
     const conversationManager = this.plugin.getConversationManager();
     const { archivedMessages, forkPoint } = await conversationManager.forkConversation(this.editingMessageId);
     
     // Remove archived messages from ChatView display
     this.removeMessagesFromIndex(forkPoint);
     
     // Clear edit state
     this.cancelEditMode();
     
     // Continue with normal message processing (context will be correct)
   }
   ```

2. Implement `removeMessagesFromIndex(index: number)`:
   - Remove messages from this.messages array starting at index
   - Remove corresponding DOM elements from messagesEl
   - Update renderedMessageIds set

3. Ensure the message being sent replaces the edited message position:
   - After fork, the input text becomes a new user message at the fork point
   - LLM processes with conversation history up to (but not including) the edited message
   - New response appears after the edited message

**Flow:**
1. User clicks edit on message at index N
2. User modifies text and presses Enter/Send
3. Messages from index N onward are archived
4. UI removes those messages from display
5. New user message is added at position N
6. LLM processes with context [0..N-1] + new message
7. Response appears after the new message

**Acceptance Criteria:**
- Sending while in edit mode triggers fork operation
- Old branch (from edit point onward) is archived
- Archived messages are removed from ChatView display
- New message replaces the edited message position
- LLM receives correct context (no archived messages)
- Edit state is cleared after send