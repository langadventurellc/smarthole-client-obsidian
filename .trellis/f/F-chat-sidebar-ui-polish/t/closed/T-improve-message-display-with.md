---
id: T-improve-message-display-with
title: Improve message display with labels, timestamps, and spacing
status: done
priority: medium
parent: F-chat-sidebar-ui-polish
prerequisites: []
affectedFiles:
  styles.css: Increased message gap from size-4-2 to size-4-4; added border-left
    to assistant messages; added new CSS classes for message header
    (.smarthole-chat-message-header), role label (.smarthole-chat-message-role),
    and timestamp (.smarthole-chat-message-timestamp)
  src/views/ChatView.ts: Added formatTimestamp() method for human-readable
    timestamps; updated renderMessage() to render a header with role label and
    timestamp before the message content
log:
  - Implemented improved message display with role labels, timestamps, and
    enhanced spacing. Added formatTimestamp() helper that shows human-readable
    times ("just now", "5m ago", "2:30 PM", or "Feb 3 2:30 PM" for older
    messages). Updated renderMessage() to include a header with role label
    ("You" / "Assistant") and timestamp. Increased message spacing from size-4-2
    to size-4-4 and added a subtle 3px left border to assistant messages for
    visual hierarchy.
schema: v1.0
childrenIds: []
created: 2026-02-03T20:01:44.986Z
updated: 2026-02-03T20:01:44.986Z
---

# Improve Message Display with Labels, Timestamps, and Spacing

Enhance message visual distinction by adding role labels, visible timestamps, and improved spacing between messages.

## Context

The current message display makes it hard to distinguish conversation turns:
- Messages have only ~8px gap between them
- No role labels to identify who said what
- Timestamps exist in data but aren't displayed
- Assistant messages lack visual hierarchy

**Parent Feature:** F-chat-sidebar-ui-polish
**Files to Modify:** `styles.css`, `src/views/ChatView.ts`

## Current State

From `styles.css:12-48`:
- Messages area uses `gap: var(--size-4-2)` (~8px)
- User messages: right-aligned, accent background
- Assistant messages: left-aligned, secondary background
- No role labels rendered
- Timestamps in `ChatMessage` interface but not displayed

From `src/views/ChatView.ts:231-261`:
- `renderMessage()` creates message bubble with content
- Shows source indicator ("typed"/"voice") for user messages
- Shows collapsible tools section for assistant messages
- Has `timestamp` field in ChatMessage interface

## Implementation Requirements

### 1. CSS Changes (styles.css)

**Increase message spacing:**
```css
.smarthole-chat-messages {
  gap: var(--size-4-4);  /* Increased from size-4-2 */
}
```

**Add visual hierarchy to assistant messages:**
```css
.smarthole-chat-message-assistant {
  background-color: var(--background-secondary);
  align-self: flex-start;
  margin-right: var(--size-4-8);
  border-left: 3px solid var(--text-muted);  /* Add left border */
}
```

**Add styles for role label and timestamp:**
```css
/* Message header with role and timestamp */
.smarthole-chat-message-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--size-4-1);
  font-size: var(--font-ui-small);
}

.smarthole-chat-message-role {
  font-weight: var(--font-semibold);
  color: var(--text-muted);
}

.smarthole-chat-message-timestamp {
  color: var(--text-faint);
  font-size: var(--font-smallest);
}
```

### 2. TypeScript Changes (src/views/ChatView.ts)

**Add timestamp formatting helper:**
```typescript
private formatTimestamp(isoString: string): string {
  const date = new Date(isoString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  
  if (diffMins < 1) return "just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  
  // Same day: show time only
  if (date.toDateString() === now.toDateString()) {
    return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  }
  
  // Different day: show date and time
  return date.toLocaleDateString([], { month: 'short', day: 'numeric' }) + 
         ' ' + date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}
```

**Update renderMessage() to add header with role and timestamp:**
```typescript
private renderMessage(message: ChatMessage): void {
  if (!this.messagesEl) return;

  const messageEl = this.messagesEl.createEl("div", {
    cls: `smarthole-chat-message smarthole-chat-message-${message.role}`,
  });

  // Add header with role label and timestamp
  const headerEl = messageEl.createEl("div", { cls: "smarthole-chat-message-header" });
  
  const roleEl = headerEl.createEl("span", { cls: "smarthole-chat-message-role" });
  roleEl.setText(message.role === "user" ? "You" : "Assistant");
  
  const timestampEl = headerEl.createEl("span", { cls: "smarthole-chat-message-timestamp" });
  timestampEl.setText(this.formatTimestamp(message.timestamp));

  // Content (existing)
  const contentEl = messageEl.createEl("div", { cls: "smarthole-chat-message-content" });
  contentEl.setText(message.content);

  // Source indicator for user messages (existing - keep as-is)
  // ... rest of existing code
}
```

## Acceptance Criteria

1. Messages have ~16px gap between them (increased from ~8px)
2. Each message displays a role label: "You" for user, "Assistant" for assistant
3. Each message displays a human-readable timestamp (e.g., "just now", "5m ago", "2:30 PM")
4. Assistant messages have a subtle left border (3px, muted color)
5. Role labels and timestamps are styled subtly (smaller font, muted colors)
6. Existing source indicators ("typed"/"voice") still appear on user messages
7. Existing collapsible tool sections still work on assistant messages
8. Layout works correctly in both light and dark themes

## Testing

- Send messages and verify role labels appear ("You" for typed, "Assistant" for responses)
- Verify timestamps update appropriately (show "just now" for recent, time for older)
- Verify message spacing is visibly increased
- Verify assistant messages have a subtle left border
- Test in both light and dark themes
- Verify tool collapsible sections still work

## Out of Scope

- Input area changes (separate task)
- Message grouping for consecutive messages from same role
- Relative timestamp auto-updating (timestamps are static once rendered)