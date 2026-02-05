---
id: T-add-footer-action-bar-with
title: Add footer action bar with edit button to ChatView messages
status: done
priority: medium
parent: F-edit-message-and-fork
prerequisites: []
affectedFiles:
  src/views/ChatView.ts: Added footer action bar in renderMessage method with edit
    button for user messages. Added data-message-id attribute and click handler
    that calls new enterEditMode stub method.
  styles.css: Added .smarthole-chat-message-footer styles (flex container, hidden
    by default, visible on hover with opacity transition),
    .smarthole-chat-action-btn styles (transparent icon button with hover
    state), and parent hover rule to show footer.
log:
  - Implemented footer action bar with edit button for ChatView messages. Added
    a footer element below message content in the renderMessage method that
    displays an edit button (pencil icon) for user messages only. The action bar
    is hidden by default and appears on message hover via CSS opacity
    transition. Also added a stub enterEditMode method that will be implemented
    in the next task (T-implement-edit-mode-state-and). The footer bar is
    extensible for additional buttons like copy (Feature 4).
schema: v1.0
childrenIds: []
created: 2026-02-05T17:55:30.960Z
updated: 2026-02-05T17:55:30.960Z
---

Create a reusable footer action bar component below message content and add edit button for user messages.

**Files to modify:**
- `src/views/ChatView.ts`
- `styles.css`

**ChatView changes (in renderMessage method):**
1. After the message content element, create a footer action bar container
2. For user messages only, add an edit button with pencil icon
3. Use `setIcon(button, "pencil")` from Obsidian API
4. Store the message ID on the button for later reference (data-message-id attribute)
5. Wire up click handler to call a new `enterEditMode(messageId)` method (implement in next task)

**CSS changes:**
1. Add `.smarthole-chat-message-footer` styles:
   - Flex container, justify-content: flex-end
   - Small margin-top, subtle appearance
   - Only visible on hover (opacity transition)

2. Add `.smarthole-chat-action-btn` styles:
   - Icon button styling (transparent background, icon size)
   - Hover state with subtle background
   - Cursor pointer

3. Make footer visible on message hover:
   ```css
   .smarthole-chat-message:hover .smarthole-chat-message-footer {
     opacity: 1;
   }
   ```

**Acceptance Criteria:**
- Footer action bar appears below message content
- Edit icon (pencil) appears only on user messages
- Action bar only visible on hover for cleaner UI
- Footer bar is extensible for copy button (Feature 4 will reuse this)
- Uses Obsidian's setIcon() for the edit icon