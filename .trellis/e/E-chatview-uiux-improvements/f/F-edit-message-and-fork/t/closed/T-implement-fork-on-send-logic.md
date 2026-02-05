---
id: T-implement-fork-on-send-logic
title: Implement fork-on-send logic when editing messages
status: done
priority: medium
parent: F-edit-message-and-fork
prerequisites:
  - T-implement-forkconversation
  - T-implement-edit-mode-state-and
  - T-add-footer-action-bar-with
affectedFiles:
  src/views/ChatView.ts: Modified handleSend() to async function that detects edit
    mode and triggers forkConversation() before sending. Added
    removeMessagesFromIndex() method to remove archived messages from UI display
    (DOM elements, renderedMessageIds set, messageElements map, and messages
    array).
log:
  - >-
    Research phase completed. Verified:

    - ChatView.ts has editingMessageId, enterEditMode(), cancelEditMode()
    implemented

    - ConversationManager.forkConversation(messageId) exists and returns {
    archivedMessages, forkPoint }

    - handleSend() currently clears edit state but doesn't trigger fork

    - Need to implement: fork-on-send logic in handleSend(),
    removeMessagesFromIndex() method


    Ready to implement the fork-on-send logic.
  - >-
    Implemented fork-on-send logic in ChatView. When a user sends a message
    while in edit mode:


    1. The conversation is forked at the edited message point using
    `ConversationManager.forkConversation()`

    2. Archived messages (from the fork point onward) are removed from the
    ChatView display via the new `removeMessagesFromIndex()` method

    3. Edit state is cleared via `cancelEditMode()`

    4. The message continues through normal processing, with the LLM receiving
    correct context (no archived messages)


    Key changes:

    - Modified `handleSend()` to be async and detect edit mode, triggering fork
    operation before sending

    - Added `removeMessagesFromIndex(index: number)` method that removes
    messages from the UI by:
      - Removing from `renderedMessageIds` set
      - Removing DOM elements
      - Removing from `messageElements` map
      - Truncating the `messages` array

    Error handling ensures edit state is cleared even if fork fails, allowing
    the user to continue.
  - >-
    Fixed critical issue: Message ID mismatch between ChatView and
    ConversationManager.


    Changes made:

    1. Added `findConversationMessageId()` method to match ChatView messages to
    ConversationManager messages by content and role (since IDs differ due to
    optimistic UI)

    2. Added `clearEditState()` method that clears edit state without clearing
    input (used before sending)

    3. Restructured `handleSend()` to:
       - Store editing state before clearing it
       - Find the corresponding ConversationManager message ID by content matching
       - Fork using the correct ID
       - Fall back to local index removal if message not found in ConversationManager
    4. Imported `ConversationManager` type for proper type annotation


    The recommendation about cancelEditMode() placement was addressed by
    creating a separate `clearEditState()` method that doesn't clear the input,
    keeping the flow cleaner.
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