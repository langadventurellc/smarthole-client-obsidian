# Chat View

In-Obsidian sidebar interface for direct interaction with the SmartHole agent, complementing voice/text routing through SmartHole desktop.

## Features

- Sidebar view accessible via ribbon icon or command palette
- Direct message input (bypasses WebSocket routing)
- Unified conversation display (WebSocket and direct messages)
- Model selector dropdown in header for quick model switching
- Tool usage display with collapsible details
- Source indicators ("typed" vs "voice")
- Real-time WebSocket message display
- Real-time agent messages during task execution (via `send_message` tool)
- Conversation history on open
- Edit previous messages with conversation forking
- Copy message content to clipboard
- File drag-and-drop inserts vault-relative paths
- Stop button to cancel in-flight LLM requests
- Retrospection messages with distinct visual styling

## Activation

### Ribbon Icon

Click the message-circle icon in the left ribbon to open the chat sidebar.

### Command Palette

Run "SmartHole: Open Chat" from the command palette (Ctrl/Cmd+P).

## Interface

```
┌─────────────────────────────────────┐
│  SmartHole Chat       [Haiku 4.5 ▼]│
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
│  [Message input...  ] [Send]/[Stop]  │
└─────────────────────────────────────┘
```

## Model Selector

The header contains a dropdown to switch between Claude models without navigating to the settings tab:

- Populates options from the `CLAUDE_MODELS` constant in `src/types.ts`
- Displays short names (e.g., "Haiku 4.5", "Sonnet 4.5", "Opus 4.5") by stripping the "Claude" prefix and parenthetical descriptions
- Pre-selects the current model from `plugin.settings.model` when the view opens
- On change, immediately updates `plugin.settings.model` and calls `plugin.saveSettings()` to persist
- All subsequent messages (both direct and WebSocket-routed) use the newly selected model

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

// Cancel in-flight LLM processing (used by stop button)
plugin.cancelCurrentProcessing();

// Subscribe to incoming WebSocket messages
plugin.onMessageReceived((message) => {
  // Display in chat
});

// Subscribe to mid-execution agent messages
plugin.onAgentMessage((message) => {
  // Display real-time agent updates
});

// Subscribe to retrospection completion
plugin.onRetrospection((result) => {
  // Display retrospection insights as distinct system message
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

## File Drag-and-Drop

Dragging files or folders from Obsidian's file explorer into the input textarea inserts clean vault-relative paths instead of `obsidian://` URLs:

1. Drag a file or folder from Obsidian's file explorer onto the input textarea
2. The `obsidian://` URL is intercepted and parsed to extract the `file` parameter
3. The vault-relative path is inserted at the current cursor position (replacing any selection)
4. URL-encoded characters are automatically decoded (e.g., `%20` becomes a space)

For example, dropping a file inserts `Projects/SmartHole-Obsidian-Plugin/Feature-Backlog` rather than `obsidian://open?vault=the%20void&file=Projects%2FSmartHole-Obsidian-Plugin%2FFeature-Backlog`.

Non-Obsidian drops (e.g., plain text from external apps) fall through to default browser behavior.

## Copy to Clipboard

Every message (both user and assistant) has a copy button in the footer action bar:

1. Hover over any message to reveal the copy button (copy icon) in the footer
2. Click the copy button to copy the message text content to the clipboard
   - Only the message `content` text is copied (no timestamps, role labels, tool usage info, or source indicators)
3. Visual feedback: the icon swaps from "copy" to "check" for 1.5 seconds, then reverts
4. Clipboard API failures are handled gracefully (logged to console, no user-facing error)

## Retrospection Messages

When conversation retrospection is enabled, a background LLM reflection runs after conversations end. The result appears as a visually distinct message in ChatView:

- Subscribed via `plugin.onRetrospection()` in `onOpen()`, cleaned up in `onClose()`
- Messages use `type: "retrospection"` on the `ChatMessage` interface
- Role label displays "Retrospection: [conversation title]" (or just "Retrospection" if untitled)
- Styled with accent border, muted text, and slightly reduced opacity (`.smarthole-chat-message-retrospection`)
- Source indicator, tool display, and edit button are skipped; copy button is available

## Stop / Cancel Processing

When the agent is processing a message, a stop button replaces the send button in the input area:

1. When processing begins (typing indicator shown), the send button hides and a red stop button (square icon) appears
2. Clicking the stop button aborts the in-flight Anthropic API request via AbortController
3. The typing indicator disappears and the send button returns immediately
4. The user's original message is preserved in conversation history
5. No error notifications are shown for cancelled requests

The cancellation propagates through the full stack: `ChatView -> Plugin.cancelCurrentProcessing() -> MessageProcessor.cancelCurrentProcessing() -> LLMService.abort() -> AbortController.abort()`. For streaming requests (the default agent path), the abort signal is bridged to `stream.abort()` on the `MessageStream` object. If the agent is in a multi-turn tool-use loop, pending tool calls are also short-circuited.

## Styling

All styles are in `styles.css` at project root:

- Uses Obsidian CSS variables for theme compatibility
- Works with light and dark themes
- Responsive to sidebar width changes

### Key CSS Classes

| Class | Purpose |
|-------|---------|
| `.smarthole-chat-container` | Main container |
| `.smarthole-chat-header` | Header bar (title + model selector) |
| `.smarthole-chat-header-title` | Header title text |
| `.smarthole-chat-model-select` | Model selector dropdown |
| `.smarthole-chat-messages` | Message list |
| `.smarthole-chat-message` | Individual message |
| `.smarthole-chat-message-user` | User message styling |
| `.smarthole-chat-message-assistant` | Assistant message styling |
| `.smarthole-chat-message-retrospection` | Retrospection message styling (accent border, muted) |
| `.smarthole-chat-input` | Input container |
| `.smarthole-chat-tools` | Tool usage display |
| `.smarthole-chat-message-footer` | Footer action bar (shows on hover) |
| `.smarthole-chat-action-btn` | Action button in footer |
| `.smarthole-chat-message-editing` | Editing state indicator |
| `.smarthole-chat-stop` | Stop/cancel button (red, replaces send during processing) |

## Implementation

Located in `src/views/`:
- `ChatView.ts` - ItemView implementation
- `index.ts` - Public exports (ChatView, VIEW_TYPE_CHAT, ChatMessage)
