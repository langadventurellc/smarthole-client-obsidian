# Chat View

In-Obsidian sidebar interface for direct interaction with the SmartHole agent, complementing voice/text routing through SmartHole desktop.

## Features

- Sidebar view accessible via ribbon icon or command palette
- Direct message input (bypasses WebSocket routing)
- Unified conversation display (WebSocket and direct messages)
- Tool usage display with collapsible details
- Source indicators ("typed" vs "voice")
- Real-time WebSocket message display
- Conversation history on open

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
│  │   • create_note             │   │
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

## Implementation

Located in `src/views/`:
- `ChatView.ts` - ItemView implementation
- `index.ts` - Public exports (ChatView, VIEW_TYPE_CHAT, ChatMessage)
