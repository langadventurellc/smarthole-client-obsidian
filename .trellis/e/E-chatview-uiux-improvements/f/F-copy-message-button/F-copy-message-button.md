---
id: F-copy-message-button
title: Copy Message Button
status: open
priority: medium
parent: E-chatview-uiux-improvements
prerequisites:
  - F-edit-message-and-fork
affectedFiles: {}
log: []
schema: v1.0
childrenIds: []
created: 2026-02-05T17:53:31.514Z
updated: 2026-02-05T17:53:31.514Z
---

# Copy Message Button

## Purpose
Add a copy icon to each message's footer action bar that copies the message text content to the clipboard. Provides quick access to message content for use elsewhere without manual text selection.

## Key Components to Implement

### 1. Copy Button in Footer Action Bar (`src/views/ChatView.ts`)
- Add copy icon to the footer action bar (created in Feature 1)
- Icon appears on BOTH user and assistant messages (unlike edit which is user-only)
- Wire click handler to copy message content

### 2. Copy Logic (`src/views/ChatView.ts`)
- Copy only the message `content` field (the text)
- Do NOT include: timestamp, role label, tools used, source indicator
- Use `navigator.clipboard.writeText()` for clipboard access

### 3. Visual Feedback (`src/views/ChatView.ts`)
- On successful copy: briefly change icon or show tooltip "Copied!"
- Use Obsidian's `setIcon()` to swap icon temporarily (e.g., "check" for 1.5s)
- Return to original "copy" icon after delay

### 4. Styles (`styles.css`)
- Reuse `.smarthole-chat-action-btn` from Feature 1
- No additional styles needed if Feature 1's footer bar is implemented first

## Acceptance Criteria
- [ ] Copy icon appears in footer action bar on ALL messages (user and assistant)
- [ ] Clicking copy puts message text content on clipboard
- [ ] Only message text is copied (no metadata, timestamps, tools info)
- [ ] Visual feedback confirms the copy action (icon changes briefly)
- [ ] Icon returns to normal state after ~1.5 seconds
- [ ] Works with messages containing special characters, newlines, unicode

## Technical Requirements
- Use `setIcon()` with "copy" icon (or "clipboard-copy")
- Use `setIcon()` with "check" icon for success feedback
- Copy uses standard `navigator.clipboard.writeText()` API
- Handle clipboard API failure gracefully (no crash, maybe log warning)

## Implementation Guidance
- If Feature 1 (Edit) is implemented first, add copy button to existing footer bar
- If implementing standalone, create the footer bar pattern here
- Store reference to button element to swap icons
- Use `setTimeout()` for icon restore after feedback

```typescript
// Example feedback pattern
const copyBtn = footerEl.createEl("button", { cls: "smarthole-chat-action-btn" });
setIcon(copyBtn, "copy");
copyBtn.addEventListener("click", async () => {
  await navigator.clipboard.writeText(message.content);
  setIcon(copyBtn, "check");
  setTimeout(() => setIcon(copyBtn, "copy"), 1500);
});
```

## Testing Requirements
- Verify copy icon appears on user messages
- Verify copy icon appears on assistant messages
- Verify clipboard contains only message text after copy
- Verify feedback icon appears and reverts
- Verify copy works with multiline messages
- Verify copy works with special characters

## Dependencies
- Builds on footer action bar pattern from F-edit-message-and-fork (but can be implemented independently if needed)