---
id: E-chatview-uiux-improvements
title: ChatView UI/UX Improvements
status: in-progress
priority: medium
parent: none
prerequisites: []
affectedFiles:
  src/context/types.ts: Added ConversationBranch interface (lines 73-82) with
    messages array and archivedAt timestamp. Added archivedBranches optional
    field to Conversation interface (line 101-102).
  src/context/index.ts: Added ConversationBranch to the type exports (line 13).
  src/views/ChatView.ts: "Added footer action bar in renderMessage method with
    edit button for user messages. Added data-message-id attribute and click
    handler that calls new enterEditMode stub method.; Added editingMessageId
    and messageElements state tracking, implemented enterEditMode() and
    cancelEditMode() methods, added Escape key handler, updated renderMessage to
    store element references, updated onClose to clean up new state; Modified
    handleSend() to async function that detects edit mode and triggers
    forkConversation() before sending. Added removeMessagesFromIndex() method to
    remove archived messages from UI display (DOM elements, renderedMessageIds
    set, messageElements map, and messages array).; Added copy button with click
    handler after the edit button block in renderMessage(). The copy button
    appears on ALL messages (user and assistant), uses
    navigator.clipboard.writeText() with try/catch error handling, and provides
    visual feedback via icon swap (copy -> check -> copy after 1500ms).; Added
    dragover and drop event listeners in onOpen() for file drag-and-drop path
    normalization, and added private insertAtCursor(text: string) method for
    inserting text at the textarea cursor position.; Added import for
    CLAUDE_MODELS and ClaudeModelId from types. Added header section in onOpen()
    before messages area with title span and model select dropdown. Dropdown
    populates from CLAUDE_MODELS with short names, pre-selects current model,
    and persists changes on selection."
  styles.css: "Added .smarthole-chat-message-footer styles (flex container, hidden
    by default, visible on hover with opacity transition),
    .smarthole-chat-action-btn styles (transparent icon button with hover
    state), and parent hover rule to show footer.; Added
    .smarthole-chat-message-editing style with outline indicator and rule to
    keep footer visible when editing; Added .smarthole-chat-header (flex row,
    border-bottom, flex-shrink: 0), .smarthole-chat-header-title (semibold,
    medium font), .smarthole-chat-model-select (small font, themed
    border/background, cursor pointer), and .smarthole-chat-model-select:focus
    (accent border, no outline) styles."
  src/context/ConversationManager.ts: "Added ConversationBranch import and
    implemented forkConversation(messageId: string) method (lines 133-177) that
    archives messages from a specified point into archivedBranches and truncates
    the active conversation."
  src/llm/types.ts: "Added 'aborted' to LLMErrorCode union type, added
    LLMError.aborted() static factory method (non-retryable), and added signal?:
    AbortSignal parameter to LLMProvider.sendMessage() interface"
  src/llm/AnthropicProvider.ts: "Added signal?: AbortSignal parameter to
    sendMessage(), passed { signal } as RequestOptions second argument to
    client.messages.create(), and added APIUserAbortError check BEFORE APIError
    check in classifyError() to prevent misclassification"
  src/llm/LLMService.ts: Added abortController field, create new AbortController
    at start of processMessage(), pass signal to both provider.sendMessage()
    calls, check abort before tool loop iterations, wrapped body in try/catch
    for abort errors (returns empty response), cleanup AbortController after
    processing, and added public abort() method
log: []
schema: v1.0
childrenIds:
  - F-copy-message-button
  - F-edit-message-and-fork
  - F-file-drag-and-drop-path
  - F-model-selector-in-chatview
  - F-stop-agent-while-processing
created: 2026-02-05T17:50:17.353Z
updated: 2026-02-05T17:50:17.353Z
---

# ChatView UI/UX Improvements

## Purpose
Enhance the SmartHole ChatView sidebar with five key UI/UX improvements that improve user control, convenience, and interaction quality when chatting with the LLM agent directly from Obsidian.

## Major Components and Deliverables

This epic delivers five distinct features:

### 1. Edit Previous Message and Fork Conversation
Allow users to click an edit icon on their previous messages to modify and resend. Creates a conversation fork, archiving the original branch while processing the edited message with correct context.

**Key Deliverables:**
- Edit icon in user message footer action bar
- Input population with original text and message highlighting
- Conversation fork logic with branch archiving
- Data model extension for `archivedBranches` on Conversation

### 2. Stop Agent While Thinking
A stop button that appears during LLM processing, allowing users to cancel in-flight API requests via AbortController.

**Key Deliverables:**
- Stop button UI (replaces send button during processing)
- AbortController integration in LLMService
- Graceful abort handling in MessageProcessor (not retryable)
- User message preserved, cancelled state feedback

### 3. Model Selector Dropdown in ChatView
Compact dropdown in the ChatView header to change the Claude model without navigating to settings.

**Key Deliverables:**
- Dropdown component using CLAUDE_MODELS constant
- Settings persistence on change
- Position in header area (compact)

### 4. Copy Message Button
Copy icon in each message's footer action bar to copy message content to clipboard.

**Key Deliverables:**
- Copy icon on both user and assistant messages
- Copies text content only (no metadata/tools)
- Visual feedback on copy action

### 5. File Drag-and-Drop Path Normalization
When dragging files from Obsidian's file explorer into the input, insert clean vault-relative paths instead of `obsidian://` URLs.

**Key Deliverables:**
- Drag/drop event handlers on input textarea
- Path extraction and URL decoding
- Works for files and folders

## Affected Components
- `src/views/ChatView.ts` - Primary implementation (all features)
- `src/processor/MessageProcessor.ts` - Cancellation support (Feature 2)
- `src/llm/LLMService.ts` - AbortController integration (Feature 2)
- `src/context/ConversationManager.ts` - Fork/archive support (Feature 1)
- `src/context/types.ts` - Data model changes (Feature 1)
- `styles.css` - Footer action bar, editing state, model selector styles (all features)
- `src/main.ts` - Settings persistence for model changes (Feature 3)

## Acceptance Criteria

### Feature 1: Edit & Fork
- [ ] Edit icon appears in footer action bar of user messages
- [ ] Clicking edit populates input with original text
- [ ] Original message shows visual editing indicator
- [ ] Sending edited message archives old branch and processes with correct context
- [ ] Archived branches are persisted but not displayed

### Feature 2: Stop Agent
- [ ] Stop button appears when "Thinking..." indicator is shown
- [ ] Clicking stop aborts the API request immediately
- [ ] UI returns to ready state (send button visible)
- [ ] User message is preserved in history
- [ ] No error notifications for cancelled requests

### Feature 3: Model Selector
- [ ] Dropdown visible in ChatView header
- [ ] Shows current model selection
- [ ] Changing model updates plugin settings
- [ ] Subsequent messages use the new model

### Feature 4: Copy Message
- [ ] Copy icon appears on all messages (user and assistant)
- [ ] Clicking copies message content to clipboard
- [ ] Visual feedback confirms the copy action
- [ ] Only message text is copied (no metadata)

### Feature 5: Drag-and-Drop Paths
- [ ] Dragging file from explorer inserts clean path
- [ ] URL-encoded characters properly decoded
- [ ] Path is vault-relative
- [ ] Works for files and folders

## Technical Considerations
- Use `setIcon()` from Obsidian API for all icons
- CSS uses Obsidian CSS variables (`--size-4-*`, `--background-*`, etc.)
- Event subscriptions return unsubscribe functions for cleanup in `onClose()`
- Settings changes go through `plugin.saveSettings()`
- Footer action bar is a new UI pattern - establish it for reuse

## User Stories
- As a user, I want to edit and resend a previous message so I can refine my request without starting over
- As a user, I want to cancel a slow or unwanted request so I don't have to wait for completion
- As a user, I want to quickly switch models without leaving the chat so I can balance speed/capability
- As a user, I want to copy message content so I can use it elsewhere
- As a user, I want to reference files by path when dragging them so the agent can find them

## Estimated Scale
5 features, each can be implemented as a separate Feature issue