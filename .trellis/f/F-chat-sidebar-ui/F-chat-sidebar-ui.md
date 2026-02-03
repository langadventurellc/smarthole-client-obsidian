---
id: F-chat-sidebar-ui
title: Chat Sidebar UI
status: done
priority: medium
parent: none
prerequisites: []
affectedFiles:
  src/views/ChatView.ts: "Created new ItemView implementation with VIEW_TYPE_CHAT
    constant and ChatView class; Complete rewrite: Added ChatMessage interface,
    message rendering with user/assistant styling, collapsible tool actions
    using details/summary, input handling with Enter to send, send button with
    Lucide icon, typing indicator methods, auto-scroll, auto-resize textarea,
    and public API for integration; Added plugin constructor parameter,
    unsubscribe property, wired send handler to processDirectMessage, subscribed
    to response callbacks in onOpen, cleanup in onClose; Added history loading
    on open, WebSocket message subscription, deduplication via
    renderedMessageIds Set, source indicator rendering, and cleanup in onClose"
  src/views/index.ts: Created barrel export for ChatView and VIEW_TYPE_CHAT; Added
    ChatMessage type export for use by other modules
  styles.css: Created root-level CSS file with .smarthole-chat-container styling
    using Obsidian CSS variables; Added comprehensive styling for messages area
    (scrollable flex container), message bubbles (user right-aligned accent,
    assistant left-aligned secondary), tool actions (collapsible
    details/summary), input area (flex with textarea and button), send button
    (icon button with hover states), and typing indicator; Added
    .smarthole-chat-source styling for the typed/voice source indicator
  src/main.ts: Added view registration, ribbon icon, command, and
    activateChatView() method; Made messageProcessor public, added
    processDirectMessage() and onMessageResponse() methods, updated view
    registration to pass plugin reference; Made conversationHistory public,
    added onMessageReceived() method for ChatView to subscribe to incoming
    messages
  src/processor/types.ts: Added ResponseCallback type for notifying listeners of
    processed message results; Added MessageReceivedCallback type for notifying
    listeners when messages are received
  src/processor/index.ts: Exported ResponseCallback type; Exported MessageReceivedCallback type
  src/processor/MessageProcessor.ts: Added response callback mechanism
    (onResponse, notifyResponseCallbacks) and conditional WebSocket notification
    skip for direct messages; Added onMessageReceived callback mechanism,
    notifyMessageReceivedCallbacks method, and included source field when
    recording history entries
  src/websocket/types.ts: Added optional source field to MessageMetadata interface
  src/context/types.ts: Added optional source field to HistoryEntry interface for
    tracking message origin (direct vs websocket)
  src/context/ConversationHistory.ts: Added getRecentConversations() method to
    expose conversation history for the chat sidebar
log:
  - "Auto-completed: All child tasks are complete"
schema: v1.0
childrenIds:
  - T-build-chat-message-display
  - T-connect-direct-input-to
  - T-create-chatview-sidebar
  - T-integrate-conversation
created: 2026-02-03T19:11:51.796Z
updated: 2026-02-03T19:11:51.796Z
---

# Chat Sidebar UI

Add a sidebar interface to Obsidian for direct interaction with the SmartHole agent, bypassing the need to route messages through the SmartHole desktop application.

## Purpose

Currently, all agent interactions require sending messages through the SmartHole desktop app via WebSocket. This feature adds an in-Obsidian chat interface so users can:
- Send messages directly to the agent
- See agent responses inline
- View the full conversation history (including messages from both sources)
- See which vault tools the agent used during processing

## Key Components

### 1. Sidebar View Infrastructure
- Create `ChatView` class extending Obsidian's `ItemView`
- Register view type with plugin (`VIEW_TYPE_CHAT`)
- Add ribbon icon (left sidebar) to toggle the chat view
- Add command palette command: "SmartHole: Open Chat"
- Sidebar should dock to right side by default

### 2. Chat Interface
- **Message input area**: Text input at bottom with send button (and Enter to send)
- **Message display**: Scrollable container showing conversation history
- **Message styling**: Match Obsidian theme using CSS variables
  - User messages: Right-aligned or distinct styling
  - Agent responses: Left-aligned or distinct styling
  - Tool actions: Collapsible or subtle inline display showing what vault operations occurred
- **Typing indicator**: Show "thinking..." while agent processes, but allow queuing additional messages

### 3. Message Routing
- Create `processDirectMessage(text: string)` method on plugin
- Generate synthetic `RoutedMessage` with unique ID and `metadata.source: "direct"`
- Route through existing `MessageProcessor.process()` with `skipAck=true` (no WebSocket ack needed)
- Capture response and display in sidebar (don't send WebSocket notification for direct messages)
- Add callback mechanism for MessageProcessor to notify sidebar of responses

### 4. Unified History Display
- Load conversation history from `ConversationHistory` on sidebar open
- Display all conversations regardless of source (WebSocket or direct)
- Include source indicator (optional subtle badge: "voice" vs "direct")
- Show tool usage inline with each agent response (tools used listed/expandable)
- History managed by existing 50-conversation limit (no manual clear button needed)

### 5. Real-time Updates
- When messages arrive via WebSocket and are processed, update sidebar if open
- When direct messages are sent, add to display immediately (optimistic UI)
- Scroll to bottom on new messages

## Technical Requirements

### Files to Create/Modify
- `src/views/ChatView.ts` - New ItemView implementation
- `src/views/ChatView.css` - Styles using Obsidian CSS variables
- `src/main.ts` - Register view, add ribbon icon, add command
- `src/processor/MessageProcessor.ts` - Add response callback mechanism
- `src/types.ts` - Add view type constant, any new interfaces

### Patterns to Follow
- Use Obsidian's `ItemView` pattern (see Obsidian plugin docs)
- Use `containerEl.createDiv()` / `createEl()` for DOM construction
- Use Obsidian CSS variables: `--background-primary`, `--text-normal`, `--interactive-accent`, etc.
- Follow existing async patterns in the codebase
- Expose callbacks on plugin instance, similar to `connection.onMessage`

### Integration Points
- `MessageProcessor.process()` - Entry point for direct messages
- `ConversationHistory` - Source for persisted history
- `LLMService` response - Includes `toolsUsed` array to display

## Acceptance Criteria

1. **Ribbon icon visible** in left sidebar that toggles the chat view
2. **Command "SmartHole: Open Chat"** available in command palette
3. **Chat sidebar opens** in right leaf when triggered
4. **Message input** allows typing and sending via Enter or button
5. **Typing indicator** shows while processing, input remains enabled for queuing
6. **Agent response** appears in chat after processing completes
7. **Tool actions displayed** inline showing which vault operations occurred
8. **Conversation history loads** from stored data when sidebar opens
9. **WebSocket messages** also appear in sidebar (unified view)
10. **Styling matches** current Obsidian theme (light/dark)
11. **Scroll behavior** - auto-scrolls to newest message

## Testing Requirements

- Manual testing: Send direct message, verify response appears
- Manual testing: Receive WebSocket message while sidebar open, verify it appears
- Manual testing: Close and reopen sidebar, verify history loads
- Manual testing: Switch between light/dark themes, verify styling adapts
- Verify tool actions display correctly for messages that used vault tools

## Security Considerations

- Direct messages use same LLM pipeline with existing API key handling
- No new external connections (localhost only, same as existing)
- Input sanitization: Use Obsidian's DOM APIs (createEl) to prevent XSS

## Performance Requirements

- Sidebar should open instantly (history loads async if large)
- Message sending should feel responsive (optimistic UI)
- Large history (50 conversations) should not cause scroll lag