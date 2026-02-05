# Chat View

In-Obsidian sidebar interface for direct interaction with the SmartHole agent, complementing voice/text routing through SmartHole desktop.

## Features

- Sidebar view accessible via ribbon icon or command palette
- Direct message input (bypasses WebSocket routing)
- Unified conversation display (WebSocket and direct messages)
- Tool usage display with collapsible details
- Source indicators ("typed" vs "voice")
- Real-time WebSocket message display
- Real-time agent messages during task execution (via `send_message` tool)
- Conversation history on open
- Edit previous messages with conversation forking
- Copy message content to clipboard

## Activation

### Ribbon Icon

Click the message-circle icon in the left ribbon to open the chat sidebar.

### Command Palette

Run "SmartHole: Open Chat" from the command palette (Ctrl/Cmd+P).

## Interface

```
┌─────────────────────────────────────┐
│  SmartHole Chat              [close]│
├─────────────────────────────────────┤
│                                     │
│  ┌─────────────────────────────┐   │
│  │ You (typed)          10:30am │   │
│  │ Create a note about today   │   │
│  └─────────────────────────────┘   │
│                                     │
│  ┌─────────────────────────────┐   │
│  │ Assistant            10:31am │   │
│  │ Created 'Meeting Notes.md'  │   │
│  │ ▼ Tools used (1)            │   │
│  │   • write_file              │   │
│  └─────────────────────────────┘   │
│                                     │
├─────────────────────────────────────┤
│  [Message input...        ] [Send]  │
└─────────────────────────────────────┘
```

## Message Sources

Messages display their origin:

| Source | Display | Origin |
|--------|---------|--------|
| `direct` | "typed" | ChatView input |
| `websocket` | "voice" | SmartHole routing |

## Tool Display

Each assistant response shows tools used:

- Collapsible per-message
- Lists tool names invoked
- Helps users understand what actions were taken

## Integration Points

### Plugin Methods

```typescript
// Send direct message (bypasses WebSocket)
plugin.processDirectMessage("Create a note about X");

// Subscribe to LLM responses
plugin.onMessageResponse((messageId, response, tools) => {
  // Update chat UI
});

// Subscribe to incoming WebSocket messages
plugin.onMessageReceived((message) => {
  // Display in chat
});

// Subscribe to mid-execution agent messages
plugin.onAgentMessage((message) => {
  // Display real-time agent updates
});
```

### History Loading

When the sidebar opens, it loads recent conversation history:

```typescript
const history = conversationHistory.getRecentConversations(50);
// Display in chat view
```

## Direct Messages

Messages entered in ChatView bypass SmartHole routing:

1. User types message in ChatView
2. `plugin.processDirectMessage()` creates synthetic RoutedMessage
3. Message marked with `source: "direct"`
4. Processed through normal MessageProcessor pipeline
5. Response displayed in ChatView

This allows using the agent without SmartHole desktop running.

## Real-Time Agent Messages

The agent can send messages during task execution using the `send_message` tool:

- Messages appear immediately in ChatView as assistant messages
- Displayed before the final response is complete
- Supports `is_question` flag for conversational workflows
- Automatically subscribed in `onOpen()` and cleaned up in `onClose()`

```typescript
// ChatView subscribes to agent messages
const unsubscribe = plugin.onAgentMessage((message) => {
  this.addMessage({
    role: "assistant",
    content: message.content,
    timestamp: new Date(message.timestamp),
  });
});
```

## Message Editing and Forking

Users can edit their previous messages, which forks the conversation:

1. Hover over a user message to reveal the edit button (pencil icon) in the footer action bar
2. Click the edit button to enter edit mode:
   - The message text populates the input textarea (selected for easy replacement)
   - The original message displays a visual editing indicator (outline)
3. Press Escape to cancel edit mode, or modify and send to fork:
   - Messages from the edit point onward are archived to a branch
   - The edited message is sent as a new message
   - LLM context reflects conversation up to (but not including) the edited message

Archived branches are preserved in `Conversation.archivedBranches` but not displayed. The fork operation uses `ConversationManager.forkConversation()` - see [Conversation History](conversation-history.md#forking-conversations) for details.

## Copy to Clipboard

Every message (both user and assistant) has a copy button in the footer action bar:

1. Hover over any message to reveal the copy button (copy icon) in the footer
2. Click the copy button to copy the message text content to the clipboard
   - Only the message `content` text is copied (no timestamps, role labels, tool usage info, or source indicators)
3. Visual feedback: the icon swaps from "copy" to "check" for 1.5 seconds, then reverts
4. Clipboard API failures are handled gracefully (logged to console, no user-facing error)

## Styling

All styles are in `styles.css` at project root:

- Uses Obsidian CSS variables for theme compatibility
- Works with light and dark themes
- Responsive to sidebar width changes

### Key CSS Classes

| Class | Purpose |
|-------|---------|
| `.smarthole-chat-container` | Main container |
| `.smarthole-chat-messages` | Message list |
| `.smarthole-chat-message` | Individual message |
| `.smarthole-chat-message-user` | User message styling |
| `.smarthole-chat-message-assistant` | Assistant message styling |
| `.smarthole-chat-input` | Input container |
| `.smarthole-chat-tools` | Tool usage display |
| `.smarthole-chat-message-footer` | Footer action bar (shows on hover) |
| `.smarthole-chat-action-btn` | Action button in footer |
| `.smarthole-chat-message-editing` | Editing state indicator |

## Implementation

Located in `src/views/`:
- `ChatView.ts` - ItemView implementation
- `index.ts` - Public exports (ChatView, VIEW_TYPE_CHAT, ChatMessage)
