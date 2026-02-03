---
id: T-fix-input-area-alignment-and
title: Fix input area alignment and sizing
status: done
priority: medium
parent: F-chat-sidebar-ui-polish
prerequisites: []
affectedFiles:
  styles.css: "Added align-items: flex-end to .smarthole-chat-input-area and
    reduced min-height from 40px to 36px in .smarthole-chat-input"
log:
  - "Fixed input area alignment and sizing by adding `align-items: flex-end` to
    `.smarthole-chat-input-area` so the send button stays at the bottom when the
    textarea grows for multi-line input, and reduced `.smarthole-chat-input`
    min-height from 40px to 36px for a more compact initial state."
schema: v1.0
childrenIds: []
created: 2026-02-03T20:01:22.403Z
updated: 2026-02-03T20:01:22.403Z
---

# Fix Input Area Alignment and Sizing

Fix the chat input area layout so the send button stays properly aligned and the textarea sizing is improved.

## Context

The current input area has alignment issues:
- When the textarea auto-resizes for multi-line input, the send button centers vertically instead of staying at the bottom
- The textarea shows a resize handle that shouldn't be visible
- The min-height creates a larger-than-necessary default state

**Parent Feature:** F-chat-sidebar-ui-polish
**Files to Modify:** `styles.css`

## Current State

From `styles.css:79-142`:
- Input area uses `display: flex` with default `align-items: stretch`
- Textarea has `min-height: 40px`, `resize: none`
- Send button is fixed at 40x40px with `flex-shrink: 0`

## Implementation Requirements

### 1. Fix Button Alignment

Change `.smarthole-chat-input-area` to use `align-items: flex-end` so the button stays at the bottom when textarea grows:

```css
.smarthole-chat-input-area {
  display: flex;
  align-items: flex-end;  /* Changed from default stretch */
  gap: var(--size-4-2);
  padding: var(--size-4-3);
  border-top: 1px solid var(--background-modifier-border);
  background-color: var(--background-primary);
}
```

### 2. Improve Textarea Sizing

Update `.smarthole-chat-input`:
- Reduce `min-height` from 40px to 36px for a more compact initial state
- Add explicit resize disabling for WebKit browsers

```css
.smarthole-chat-input {
  flex: 1;
  resize: none;
  min-height: 36px;  /* Reduced from 40px */
  max-height: 120px;
  /* ... rest unchanged */
}
```

## Acceptance Criteria

1. Send button stays aligned to bottom of input area when textarea has multiple lines of text
2. Textarea has no visible resize handle in any browser
3. Initial textarea height is compact but comfortable for single-line input
4. Input area still looks good in both light and dark themes
5. Enter to send and Shift+Enter for newline still work correctly

## Testing

- Type a multi-line message (use Shift+Enter) and verify the send button stays at the bottom-right
- Verify no resize handle appears on the textarea corner
- Test in both light and dark Obsidian themes

## Out of Scope

- Message display changes (separate task)
- JavaScript changes to auto-resize behavior
- Changes to input handling logic