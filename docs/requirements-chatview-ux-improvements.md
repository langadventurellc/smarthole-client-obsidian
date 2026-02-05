# ChatView UI/UX Improvements - Requirements Document

## Overview

This work adds five UI/UX improvements to the SmartHole ChatView sidebar to enhance the user experience when interacting with the LLM agent directly from Obsidian.

**Affected Components:**
- `src/views/ChatView.ts` - Primary implementation location
- `src/processor/MessageProcessor.ts` - Cancellation support
- `src/llm/LLMService.ts` - AbortController integration
- `src/context/ConversationManager.ts` - Fork/archive support
- `styles.css` - New UI element styles
- `src/main.ts` - Settings persistence for model changes

---

## 1. Edit Previous Message and Fork Conversation

**What:** Users can click an edit icon on any of their previous messages to modify the text and resend it. When they do, the conversation forks from that point.

**Behavior:**
- Edit icon appears in the footer action bar of user messages
- Clicking edit populates the input textarea with the original message text and highlights/selects it
- The message being edited should have a visual indicator (e.g., highlighted border)
- When the user sends the edited message:
  - Archive the original conversation branch (messages from the edited point onward)
  - The archived branch is hidden from view but preserved in data (for potential future "view archived branches" feature)
  - Process the edited message as a new message, continuing from that fork point
  - The LLM context should reflect the conversation up to (but not including) the edited message

**Data Model Changes:**
- `Conversation` needs a field to track archived branches (e.g., `archivedBranches: ConversationBranch[]`)
- Each branch stores the messages that were replaced and a timestamp of when it was archived

**UI States:**
- Default: Edit icon visible in user message footer
- Editing: Input populated, original message highlighted, send button text could change to "Resend" or remain "Send"
- After fork: Normal conversation view with new messages

**Done when:**
- User can click edit on any user message
- Input is populated with that message's text
- Sending creates a fork, archives old messages, and processes new message with correct context
- Archived branches are persisted but not displayed

---

## 2. Stop Agent While Thinking

**What:** A stop button appears when the agent is processing a message, allowing the user to cancel the in-flight API request.

**Behavior:**
- When "Thinking..." indicator is shown, display a stop button (e.g., square/stop icon) next to or instead of the send button
- Clicking stop aborts the Anthropic API request via AbortController
- The typing indicator disappears
- An informational message appears (either as a system message or subtle UI feedback) indicating the request was cancelled
- The user's original message remains in the conversation (it was sent and should be recorded)

**Implementation Notes:**
- `LLMService` needs to accept and use an AbortController signal
- `MessageProcessor.processWithRetry` needs to pass the signal and handle abort errors gracefully (not as retryable errors)
- The abort should propagate to any tool executions in progress if the agent was in a tool-use loop

**UI States:**
- Processing: Show stop button, hide send button
- After cancel: Return to default state (send button visible)

**Done when:**
- Stop button appears during LLM processing
- Clicking stop cancels the API request immediately
- UI returns to ready state
- User message is preserved in history
- No error notifications are shown for cancelled requests

---

## 3. Model Selector Dropdown in ChatView

**What:** A dropdown in the ChatView header area allows users to change the Claude model without navigating to settings.

**Behavior:**
- Dropdown displays the current model (e.g., "Haiku 4.5", "Sonnet 4.5", "Opus 4.5")
- Selecting a different model persists it to plugin settings immediately
- The change affects all future messages (both direct ChatView messages and WebSocket-routed messages)
- Use the existing `CLAUDE_MODELS` constant from `src/types.ts` for options

**UI Location:**
- Add to the ChatView header area (top of the sidebar, below the title or as part of the title row)
- Should be compact and not take excessive space

**Done when:**
- Dropdown is visible in ChatView header
- Shows current model selection
- Changing model updates plugin settings
- Subsequent messages use the new model

---

## 4. Copy Message Button

**What:** A copy icon in each message's footer action bar allows copying the message content to clipboard.

**Behavior:**
- Copy icon appears in the footer action bar of both user and assistant messages
- Clicking copies only the message text content (not tool usage info, timestamps, or other metadata)
- Visual feedback on click (icon changes briefly, or tooltip shows "Copied!")
- For assistant messages, copies only the `content` field, not the tools-used section

**UI Design:**
- Footer action bar below message content (same row where edit icon appears for user messages)
- Icon: Use Obsidian's "copy" or "clipboard" icon
- Both user and assistant messages get the copy button

**Done when:**
- Copy icon appears on all messages (user and assistant)
- Clicking copies message content to clipboard
- Visual feedback confirms the copy action
- Only message text is copied (no metadata)

---

## 5. File Drag-and-Drop Path Normalization

**What:** When dragging a file from Obsidian's file explorer into the ChatView input, insert the clean vault-relative path instead of the `obsidian://` URL.

**Current Behavior:**
- Dropping a file inserts: `obsidian://open?vault=the%20void&file=Projects%2FSmartHole-Obsidian-Plugin%2FFeature-Backlog`

**Desired Behavior:**
- Dropping a file inserts: `Projects/SmartHole-Obsidian-Plugin/Feature-Backlog`

**Implementation:**
- Listen for drag/drop events on the input textarea
- Extract the file path from the drag data (Obsidian provides file path in drag events)
- Decode any URL-encoded characters
- Insert the clean path at the cursor position
- Prevent the default behavior that inserts the obsidian:// URL

**Done when:**
- Dragging a file from file explorer into input textarea inserts the clean path
- URL-encoded characters are properly decoded (spaces, etc.)
- Path is vault-relative (not absolute filesystem path)
- Works for both files and folders

---

## Technical Considerations

**Existing Patterns to Follow:**
- Use `setIcon()` from Obsidian API for icons
- CSS uses Obsidian CSS variables (`--size-4-*`, `--background-*`, etc.)
- Event subscriptions return unsubscribe functions for cleanup in `onClose()`
- Settings changes go through `plugin.saveSettings()`

**Testing Approach:**
- Each feature can be tested independently
- Cancellation should be tested with slow responses (Opus model or complex prompts)
- Fork behavior should verify context is correct after fork
- Copy should work with messages containing special characters
