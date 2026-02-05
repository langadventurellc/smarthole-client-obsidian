---
id: T-add-copy-to-clipboard-button
title: Add copy-to-clipboard button with visual feedback to message footer
status: done
priority: medium
parent: F-copy-message-button
prerequisites: []
affectedFiles:
  src/views/ChatView.ts: Added copy button with click handler after the edit
    button block in renderMessage(). The copy button appears on ALL messages
    (user and assistant), uses navigator.clipboard.writeText() with try/catch
    error handling, and provides visual feedback via icon swap (copy -> check ->
    copy after 1500ms).
log:
  - Starting implementation. Adding copy-to-clipboard button to renderMessage()
    in ChatView.ts, placed after the edit button block so it applies to ALL
    messages.
  - Added a copy-to-clipboard button to the footer action bar of every message
    in ChatView. The button uses the existing smarthole-chat-action-btn class,
    copies only message.content text (no metadata), provides visual feedback by
    swapping to a checkmark icon for 1.5 seconds, and handles clipboard API
    failures gracefully with console.warn.
schema: v1.0
childrenIds: []
created: 2026-02-05T18:29:58.703Z
updated: 2026-02-05T18:29:58.703Z
---

Add a copy button to the footer action bar of every message (both user and assistant) in `ChatView.ts` that copies the message text content to the clipboard with visual feedback.

## What to implement

### 1. Copy button in `renderMessage()` (`src/views/ChatView.ts`)
In the `renderMessage` method, after the existing footer action bar creation (line ~393), add a copy button for ALL messages (not just user messages like the edit button). The button should:
- Use class `smarthole-chat-action-btn` (already defined in `styles.css`)
- Use `setIcon(copyBtn, "copy")` for the icon
- Include `aria-label: "Copy message"` for accessibility

### 2. Click handler: copy message content
- On click, copy `message.content` using `navigator.clipboard.writeText()`
- Copy ONLY the text content — do NOT include timestamp, role label, tools used, or source indicator

### 3. Visual feedback on copy
- On successful copy, swap icon to "check" via `setIcon(copyBtn, "check")`
- After 1500ms, restore original icon via `setIcon(copyBtn, "copy")`
- Store a reference to the button element to enable the icon swap

### 4. Error handling
- Wrap clipboard API call in try/catch
- On failure, log a warning with `console.warn()` — do NOT show an Obsidian notice
- Do not crash or throw if clipboard access is denied

## Placement in existing code
The footer action bar is already created at line 393 of `ChatView.ts`:
```typescript
const footerEl = messageEl.createEl("div", { cls: "smarthole-chat-message-footer" });
```

The edit button is currently added only for user messages (lines 396-406). The copy button should be added OUTSIDE the `if (message.role === "user")` block so it appears on ALL messages.

## No new CSS needed
The existing `.smarthole-chat-action-btn` styles in `styles.css` are sufficient. No additional styles are required.

## Acceptance criteria
- Copy icon appears in footer action bar on ALL messages (user and assistant)
- Clicking copy puts message text content on clipboard
- Only message text is copied (no metadata, timestamps, tools info)
- Visual feedback confirms the copy action (icon changes to checkmark briefly)
- Icon returns to normal state after ~1.5 seconds
- Works with messages containing special characters, newlines, unicode
- Clipboard API failure is handled gracefully (no crash)