---
id: F-edit-message-and-fork
title: Edit Message and Fork Conversation
status: done
priority: medium
parent: E-chatview-uiux-improvements
prerequisites: []
affectedFiles:
  src/context/types.ts: Added ConversationBranch interface (lines 73-82) with
    messages array and archivedAt timestamp. Added archivedBranches optional
    field to Conversation interface (line 101-102).
  src/context/index.ts: Added ConversationBranch to the type exports (line 13).
  src/views/ChatView.ts: Added footer action bar in renderMessage method with edit
    button for user messages. Added data-message-id attribute and click handler
    that calls new enterEditMode stub method.; Added editingMessageId and
    messageElements state tracking, implemented enterEditMode() and
    cancelEditMode() methods, added Escape key handler, updated renderMessage to
    store element references, updated onClose to clean up new state; Modified
    handleSend() to async function that detects edit mode and triggers
    forkConversation() before sending. Added removeMessagesFromIndex() method to
    remove archived messages from UI display (DOM elements, renderedMessageIds
    set, messageElements map, and messages array).
  styles.css: Added .smarthole-chat-message-footer styles (flex container, hidden
    by default, visible on hover with opacity transition),
    .smarthole-chat-action-btn styles (transparent icon button with hover
    state), and parent hover rule to show footer.; Added
    .smarthole-chat-message-editing style with outline indicator and rule to
    keep footer visible when editing
  src/context/ConversationManager.ts: "Added ConversationBranch import and
    implemented forkConversation(messageId: string) method (lines 133-177) that
    archives messages from a specified point into archivedBranches and truncates
    the active conversation."
log:
  - "Auto-completed: All child tasks are complete"
schema: v1.0
childrenIds:
  - T-add-conversationbranch-type
  - T-add-footer-action-bar-with
  - T-implement-edit-mode-state-and
  - T-implement-fork-on-send-logic
  - T-implement-forkconversation
created: 2026-02-05T17:52:37.649Z
updated: 2026-02-05T17:52:37.649Z
---

# Edit Message and Fork Conversation

## Purpose
Allow users to click an edit icon on their previous messages to modify and resend them. When edited, the conversation forks from that point - archiving the original branch while processing the edited message with the correct historical context.

## Key Components to Implement

### 1. Data Model Changes (`src/context/types.ts`)
- Add `ConversationBranch` type with `messages: ConversationMessage[]`, `archivedAt: string`
- Add `archivedBranches?: ConversationBranch[]` field to `Conversation` type

### 2. ConversationManager Fork Support (`src/context/ConversationManager.ts`)
- Add `forkConversation(messageId: string): { archivedMessages: ConversationMessage[], forkPoint: number }` method
- Archives messages from the fork point onward into a new branch
- Removes archived messages from the active conversation
- Persists the archived branch data

### 3. Footer Action Bar UI (`src/views/ChatView.ts`)
- Create reusable footer action bar component below message content
- Add edit icon (pencil) for user messages only
- Wire up click handler to trigger edit mode

### 4. Edit Mode State (`src/views/ChatView.ts`)
- Track `editingMessageId: string | null` state
- When editing: populate input with original text, select/highlight it
- Add visual indicator on the message being edited (e.g., highlighted border via CSS class)
- Clear edit state when message is sent or cancelled (Escape key)

### 5. Fork-on-Send Logic (`src/views/ChatView.ts`)
- When sending while in edit mode:
  1. Call `conversationManager.forkConversation(editingMessageId)`
  2. Clear the archived messages from the ChatView display
  3. Process the edited message normally (context will be correct since archived messages are removed)
  4. Clear edit state

### 6. Styles (`styles.css`)
- `.smarthole-chat-message-footer` - footer action bar container
- `.smarthole-chat-action-btn` - action button base styles
- `.smarthole-chat-message-editing` - editing state indicator on message

## Acceptance Criteria
- [ ] Edit icon appears in footer action bar of user messages (not assistant messages)
- [ ] Clicking edit populates input textarea with the original message text
- [ ] Input text is selected for easy replacement
- [ ] Original message shows visual editing indicator (highlighted border)
- [ ] Pressing Escape cancels edit mode without changes
- [ ] Sending edited message archives old branch (messages from that point onward)
- [ ] Archived branches are persisted in conversation data but not displayed
- [ ] LLM receives correct context (conversation up to but not including the edited message)
- [ ] New response appears after the edited message position

## Technical Requirements
- Use `setIcon()` from Obsidian API for the edit icon (use "pencil" icon)
- Footer action bar should be extensible for copy button (Feature 4)
- Archived branches stored in `Conversation.archivedBranches` array
- Editing state CSS class: `smarthole-chat-message-editing`

## Implementation Guidance
- Add the footer action bar in `renderMessage()` method
- Edit mode is a ChatView-level state, not per-message
- Fork operation should be atomic - archive and remove in one save operation
- Consider using `vault.process()` pattern if modifying files, though conversation data is in plugin storage

## Testing Requirements
- Verify edit icon only appears on user messages
- Verify input population and selection works
- Verify fork creates archived branch with correct messages
- Verify subsequent conversation has correct context (no archived messages)
- Verify archived branches persist across plugin reload

## Dependencies
- None (can be implemented independently)