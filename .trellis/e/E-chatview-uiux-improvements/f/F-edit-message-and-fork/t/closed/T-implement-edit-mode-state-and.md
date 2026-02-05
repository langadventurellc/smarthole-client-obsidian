---
id: T-implement-edit-mode-state-and
title: Implement edit mode state and input population in ChatView
status: done
priority: medium
parent: F-edit-message-and-fork
prerequisites: []
affectedFiles:
  src/views/ChatView.ts: Added editingMessageId and messageElements state
    tracking, implemented enterEditMode() and cancelEditMode() methods, added
    Escape key handler, updated renderMessage to store element references,
    updated onClose to clean up new state
  styles.css: Added .smarthole-chat-message-editing style with outline indicator
    and rule to keep footer visible when editing
log:
  - >-
    Started implementation. Analyzed existing codebase:

    - ChatView.ts has a stub `enterEditMode(messageId: string)` method

    - Footer action bar with edit button already exists for user messages

    - Need to add state tracking, implement edit/cancel methods, and add Escape
    key handler

    - styles.css needs `.smarthole-chat-message-editing` style
  - Implemented edit mode state tracking and input population in ChatView. Added
    `editingMessageId` state to track which message is being edited,
    `messageElements` Map to store references to rendered message elements for
    highlighting. Implemented `enterEditMode()` which populates the input
    textarea with the original message content, selects all text, focuses the
    input, and adds a visual editing indicator (highlighted border via CSS
    class). Implemented `cancelEditMode()` which clears the edit state, removes
    the editing class, and clears the input. Added Escape key handler to cancel
    edit mode. Added CSS styles for `.smarthole-chat-message-editing` with an
    outline indicator and persistent footer visibility.
schema: v1.0
childrenIds: []
created: 2026-02-05T17:55:39.456Z
updated: 2026-02-05T17:55:39.456Z
---

Add state tracking for edit mode and implement the UI behavior when editing a message.

**Files to modify:**
- `src/views/ChatView.ts`
- `styles.css`

**ChatView changes:**
1. Add state tracking:
   ```typescript
   private editingMessageId: string | null = null;
   ```

2. Implement `enterEditMode(messageId: string)`:
   - Set editingMessageId
   - Find the original message content
   - Populate input textarea with original text
   - Select all text in textarea (setSelectionRange)
   - Focus the textarea
   - Add visual indicator to the message being edited (CSS class)
   - Find message element and add `smarthole-chat-message-editing` class

3. Implement `cancelEditMode()`:
   - Clear editingMessageId to null
   - Clear input textarea
   - Remove editing class from message element
   - Call when Escape key is pressed

4. Add Escape key handler in input keydown listener:
   ```typescript
   if (e.key === "Escape" && this.editingMessageId) {
     e.preventDefault();
     this.cancelEditMode();
   }
   ```

5. Track rendered message elements by ID for finding the element to highlight

**CSS changes:**
Add `.smarthole-chat-message-editing` style:
- Highlighted border (e.g., 2px solid var(--interactive-accent))
- Or subtle background change to indicate editing state

**Acceptance Criteria:**
- Clicking edit button populates input with original message text
- Text in input is selected for easy replacement
- Original message shows visual editing indicator (highlighted border)
- Pressing Escape cancels edit mode without changes
- Edit state is cleared properly on cancel