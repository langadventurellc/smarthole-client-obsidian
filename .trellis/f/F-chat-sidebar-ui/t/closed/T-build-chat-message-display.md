---
id: T-build-chat-message-display
title: Build chat message display and input UI
status: done
priority: high
parent: F-chat-sidebar-ui
prerequisites:
  - T-create-chatview-sidebar
affectedFiles:
  src/views/ChatView.ts: "Complete rewrite: Added ChatMessage interface, message
    rendering with user/assistant styling, collapsible tool actions using
    details/summary, input handling with Enter to send, send button with Lucide
    icon, typing indicator methods, auto-scroll, auto-resize textarea, and
    public API for integration"
  src/views/index.ts: Added ChatMessage type export for use by other modules
  styles.css: Added comprehensive styling for messages area (scrollable flex
    container), message bubbles (user right-aligned accent, assistant
    left-aligned secondary), tool actions (collapsible details/summary), input
    area (flex with textarea and button), send button (icon button with hover
    states), and typing indicator
log:
  - Starting implementation - Research complete, verified file paths exist. Will
    update ChatView.ts with message rendering, input handling, and typing
    indicator, then update styles.css with complete styling.
  - >-
    Implemented complete chat message display and input UI for the SmartHole
    Chat sidebar. The implementation includes:


    1. **ChatMessage interface** - Defined with id, role (user/assistant),
    content, timestamp, toolsUsed array, and source (direct/websocket)


    2. **DOM structure** - Created proper hierarchy with
    .smarthole-chat-container containing scrollable .smarthole-chat-messages and
    fixed .smarthole-chat-input-area with textarea and send button


    3. **Message rendering** - renderMessage() creates properly styled message
    elements with user messages right-aligned (accent color) and assistant
    messages left-aligned (secondary background)


    4. **Tool actions display** - Uses collapsible <details>/<summary> pattern
    showing "Tools used (N)" that expands to show bulleted list of tool names


    5. **Input handling** - Enter sends message (Shift+Enter for newline), send
    button with Lucide "send" icon, input clears after sending, auto-resize
    textarea


    6. **Typing indicator** - showTypingIndicator() and hideTypingIndicator()
    public methods showing "Thinking..." in italics


    7. **Scroll behavior** - Auto-scrolls to bottom on new messages using smooth
    behavior


    8. **Public API** - addMessage(), showTypingIndicator(),
    hideTypingIndicator(), clearMessages(), setOnSendCallback() for external
    integration


    9. **Styling** - Complete CSS using Obsidian CSS variables for theme
    compatibility (light/dark), proper spacing, border-radius, hover states, and
    responsive layout
schema: v1.0
childrenIds: []
created: 2026-02-03T19:12:26.078Z
updated: 2026-02-03T19:12:26.078Z
---

# Build Chat Message Display and Input UI

Implement the chat interface within ChatView: message display area, input field, and message rendering.

## What to Implement

### 1. Update ChatView structure

In `onOpen()`, create the DOM structure:
```
.smarthole-chat-container
├── .smarthole-chat-messages (scrollable, flex-grow)
│   └── [message elements rendered here]
└── .smarthole-chat-input-area (fixed at bottom)
    ├── textarea.smarthole-chat-input
    └── button.smarthole-chat-send
```

### 2. Message rendering

Create method to render a single message:
```typescript
interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: string;
  toolsUsed?: string[];
  source?: "direct" | "websocket";
}

renderMessage(message: ChatMessage): HTMLElement {
  // Create message container with appropriate class
  // Add content
  // If assistant and toolsUsed, add collapsible tool actions section
  // Return element
}
```

### 3. Tool actions display

For assistant messages with `toolsUsed`, render a collapsible section:
```
[Response text]
▶ Tools used (3)  <- clickable to expand
  • createNote: Daily Notes/2024-01-15.md
  • searchNotes: "project meeting"
  • modifyNote: Projects/Active.md
```

Use Obsidian's `details`/`summary` pattern or simple toggle.

### 4. Input handling

- Textarea with placeholder "Type a message..."
- Send button with send icon
- Enter to send (Shift+Enter for newline)
- Clear input after sending
- Input remains enabled while processing (allows queuing)

### 5. Typing indicator

When processing:
```
.smarthole-chat-typing
└── "Thinking..."
```

Show at bottom of messages area, remove when response arrives.

### 6. Scroll behavior

- Auto-scroll to bottom when new messages added
- Use `scrollIntoView({ behavior: "smooth" })` or direct scrollTop

### 7. Styling (ChatView.css)

```css
.smarthole-chat-messages {
  flex: 1;
  overflow-y: auto;
  padding: var(--size-4-2);
}

.smarthole-chat-message {
  margin-bottom: var(--size-4-2);
  padding: var(--size-4-2);
  border-radius: var(--radius-s);
}

.smarthole-chat-message-user {
  background-color: var(--background-secondary);
  margin-left: var(--size-4-4);
}

.smarthole-chat-message-assistant {
  background-color: var(--background-primary-alt);
  margin-right: var(--size-4-4);
}

.smarthole-chat-input-area {
  display: flex;
  gap: var(--size-4-2);
  padding: var(--size-4-2);
  border-top: 1px solid var(--background-modifier-border);
}

.smarthole-chat-input {
  flex: 1;
  resize: none;
  min-height: 40px;
  max-height: 120px;
}

.smarthole-chat-tools {
  font-size: var(--font-smaller);
  color: var(--text-muted);
  margin-top: var(--size-4-1);
}

.smarthole-chat-typing {
  color: var(--text-muted);
  font-style: italic;
  padding: var(--size-4-2);
}
```

## Files to Modify
- `src/views/ChatView.ts` - Add message rendering, input handling
- `src/views/ChatView.css` - Add all styling

## Acceptance Criteria

1. Messages display in scrollable area with user/assistant distinction
2. User messages visually distinct from assistant messages
3. Tool actions appear collapsed under assistant messages that used tools
4. Tool actions expandable to see details
5. Input textarea at bottom with send button
6. Enter sends message, Shift+Enter adds newline
7. Input clears after sending
8. "Thinking..." indicator shows during processing
9. New messages auto-scroll into view
10. Styling adapts to light/dark Obsidian themes