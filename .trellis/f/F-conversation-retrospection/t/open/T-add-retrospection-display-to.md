---
id: T-add-retrospection-display-to
title: Add retrospection display to ChatView
status: open
priority: medium
parent: F-conversation-retrospection
prerequisites:
  - T-integrate-retrospection
affectedFiles: {}
log: []
schema: v1.0
childrenIds: []
created: 2026-02-05T23:05:38.026Z
updated: 2026-02-05T23:05:38.026Z
---

Display retrospection results as a visually distinct system message in the ChatView sidebar.

## Implementation Plan

### File: `src/views/ChatView.ts`

**1. Extend `ChatMessage` interface** (line ~8-15)

Add an optional `type` field:

```typescript
export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: string;
  toolsUsed?: string[];
  source?: "direct" | "websocket";
  type?: "retrospection";  // ADD THIS
}
```

**2. Add unsubscribe field** (line ~26, after `unsubscribeAgentMessage`)

```typescript
private unsubscribeRetrospection: (() => void) | null = null;
```

**3. Subscribe in `onOpen()`** (around line 196-204, after the `unsubscribeAgentMessage` subscription)

Follow the same pattern as the existing `onAgentMessage` subscription:

```typescript
// Subscribe to retrospection completion
this.unsubscribeRetrospection = this.plugin.onRetrospection((result) => {
  this.addMessage({
    id: `retrospection-${crypto.randomUUID()}`,
    role: "assistant",
    content: result.content,
    timestamp: result.timestamp,
    type: "retrospection",
  });
});
```

Note: We use `role: "assistant"` because the `ChatMessage` interface currently restricts `role` to `"user" | "assistant"`. The `type: "retrospection"` field distinguishes it for rendering purposes.

**4. Unsubscribe in `onClose()`** (around line 238-244, after `unsubscribeAgentMessage` cleanup)

```typescript
// Clean up retrospection subscription
this.unsubscribeRetrospection?.();
this.unsubscribeRetrospection = null;
```

**5. Update `renderMessage()` to handle retrospection type** (line ~432-511)

In the `renderMessage()` method, add detection for `message.type === "retrospection"` to apply distinct CSS class and header:

```typescript
private async renderMessage(message: ChatMessage): Promise<void> {
  if (!this.messagesEl) return;

  // Determine CSS class based on message type
  const isRetrospection = message.type === "retrospection";
  const roleClass = isRetrospection
    ? "smarthole-chat-message-retrospection"
    : `smarthole-chat-message-${message.role}`;

  const messageEl = this.messagesEl.createEl("div", {
    cls: `smarthole-chat-message ${roleClass}`,
  });

  // Store reference for edit mode highlighting
  this.messageElements.set(message.id, messageEl);

  // Header with role label and timestamp
  const headerEl = messageEl.createEl("div", { cls: "smarthole-chat-message-header" });

  const roleEl = headerEl.createEl("span", { cls: "smarthole-chat-message-role" });
  roleEl.setText(
    isRetrospection
      ? "Retrospection"
      : message.role === "user"
        ? "You"
        : "Assistant"
  );

  const timestampEl = headerEl.createEl("span", { cls: "smarthole-chat-message-timestamp" });
  timestampEl.setText(this.formatTimestamp(message.timestamp));

  // Content
  const contentEl = messageEl.createEl("div", {
    cls: "smarthole-chat-message-content markdown-rendered",
  });
  await MarkdownRenderer.render(this.app, message.content, contentEl, "", this);

  // Source indicator (skip for retrospection)
  if (!isRetrospection && message.role === "user" && message.source) {
    const sourceEl = messageEl.createEl("div", { cls: "smarthole-chat-source" });
    sourceEl.setText(message.source === "direct" ? "typed" : "voice");
  }

  // Tool actions (skip for retrospection)
  if (!isRetrospection && message.role === "assistant" && message.toolsUsed && message.toolsUsed.length > 0) {
    // ... existing tools rendering ...
  }

  // Footer action bar
  const footerEl = messageEl.createEl("div", { cls: "smarthole-chat-message-footer" });

  // Edit button for user messages only (not retrospection)
  if (!isRetrospection && message.role === "user") {
    // ... existing edit button ...
  }

  // Copy button for all messages (including retrospection)
  // ... existing copy button ...
}
```

The key changes:
- Add `isRetrospection` boolean check at the top
- Use `smarthole-chat-message-retrospection` CSS class instead of the role-based class
- Show "Retrospection" as the role label
- Skip source indicator, tool actions, and edit button for retrospection messages
- Keep the copy button (users may want to copy retrospection content)

### File: `styles.css`

**6. Add retrospection message styles** (after `.smarthole-chat-message-assistant` styles, around line ~75)

```css
/* Retrospection messages - visually distinct system message */
.smarthole-chat-message-retrospection {
  background-color: var(--background-secondary);
  align-self: stretch;
  margin: 0;
  max-width: 100%;
  border-left: 3px solid var(--text-accent);
  opacity: 0.85;
}

.smarthole-chat-message-retrospection .smarthole-chat-message-role {
  font-style: italic;
  color: var(--text-accent);
}

.smarthole-chat-message-retrospection .smarthole-chat-message-content {
  color: var(--text-muted);
  font-size: var(--font-smaller);
}
```

Design rationale:
- Uses `var(--text-accent)` for the left border (distinguishing from assistant's `var(--text-muted)` border)
- `align-self: stretch` and `max-width: 100%` makes it span the full width (unlike user/assistant messages which are 85% and offset)
- `opacity: 0.85` provides subtle visual de-emphasis
- Italic role label and muted/smaller content signal "meta" status
- Uses only Obsidian CSS variables for theme consistency

## Behavior Notes

- If ChatView is open when retrospection completes, the message appears automatically via the callback (no refresh needed)
- If ChatView is not open, the message is silently omitted (insights are persisted to `.smarthole/retrospection.md`)
- Retrospection messages are transient — they do NOT appear when loading conversation history on `onOpen()`. They exist only as live callbacks while the view is open
- The message deduplication via `renderedMessageIds` (line 265-268) prevents duplicates using the random UUID

## Prerequisites

- T-integrate-retrospection (for `plugin.onRetrospection()` delegation method)

## Acceptance Criteria

- [ ] `ChatMessage` interface includes optional `type?: "retrospection"` field
- [ ] `onOpen()` subscribes to `plugin.onRetrospection()` callback
- [ ] `onClose()` unsubscribes from retrospection callback
- [ ] Callback creates a `ChatMessage` with `type: "retrospection"` and renders it
- [ ] `renderMessage()` detects retrospection type and applies distinct CSS class
- [ ] Retrospection messages show "Retrospection" as the role label
- [ ] Retrospection messages skip edit button, source indicator, and tool actions
- [ ] Retrospection messages keep the copy button
- [ ] CSS styling makes retrospection messages visually distinct from assistant messages
- [ ] `mise run quality` passes