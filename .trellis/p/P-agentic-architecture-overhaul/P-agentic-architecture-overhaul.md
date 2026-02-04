---
id: P-agentic-architecture-overhaul
title: Agentic Architecture Overhaul
status: in-progress
priority: high
parent: none
prerequisites: []
affectedFiles:
  src/llm/tools/protected.ts: Created new protected path utility with
    isProtectedPath(), assertNotProtected(), and internal normalizePath()
    functions; Added case-insensitive comparison by normalizing paths to
    lowercase before checking against PROTECTED_FOLDERS. Updated
    isProtectedPath() and assertNotProtected() functions. Enhanced docstring
    examples to document case-insensitive behavior.
  src/llm/tools/readFile.ts: Created new read_file tool with path validation,
    protected path checking, line number formatting, optional line range
    filtering, and smart truncation for large files; Added import for
    findFileInsensitive from pathUtils.ts. Replaced app.vault.getFileByPath()
    with findFileInsensitive() for case-insensitive file lookup. Added handling
    for ambiguous paths (multiple case-insensitive matches) with a helpful error
    message.
  src/llm/tools/index.ts: Added import and export for createReadFileTool, added to
    createVaultTools() array; Added import and export for createEditFileTool,
    added to createVaultTools array; Added import and export for
    createEditFileTool, added to createVaultTools array (completed in
    T-implement-edit-file-tool-with); Added import, registration in
    createVaultTools(), and re-export for createWriteFileTool; Already modified
    in T-implement-write-file-tool - contains import, array registration, and
    re-export for createWriteFileTool; Added import for createCreateFolderTool,
    added it to createVaultTools() array, and added re-export; Added import for
    createDeleteFileTool, added to createVaultTools() array, and added
    re-export; Added import for createMoveFileTool, included it in the
    createVaultTools() array, and added re-export for selective use.; Added
    import for createSearchFilesTool from ./searchFiles, added
    createSearchFilesTool(app) to the createVaultTools() return array, and added
    re-export statement for selective use; Added import for createListFilesTool,
    added to createVaultTools() array, and added re-export; Added import,
    registration in createVaultTools() array, and re-export for
    createGetFileInfoTool; Added exports for createSendMessageTool,
    SendMessageContext, and SendMessageInput from sendMessage module; Removed
    imports for createCreateNoteTool, createModifyNoteTool,
    createSearchNotesTool, createOrganizeNoteTool; removed them from
    createVaultTools() array; removed their re-export statements; Added exports
    for createEndConversationTool and related types (EndConversationContext,
    EndConversationInput); Added exports for createGetConversationTool factory
    function and GetConversationContext, GetConversationInput types from the
    getConversation module, following the existing pattern for context-dependent
    tools.
  src/llm/tools/editFile.ts: "Created new edit_file tool with search/replace
    functionality, supporting first occurrence or all occurrences replacement,
    protected path validation, and atomic file operations; Extended edit_file
    tool with line-based operations: insert_after_line, insert_before_line,
    delete_lines parameters. Added determineOperationMode(),
    executeSearchReplace(), executeLineBased(), executeInsertAfterLine(),
    executeInsertBeforeLine(), and executeDeleteLines() functions. Updated tool
    description and inputSchema to document new parameters."
  src/llm/tools/writeFile.ts: Created new write_file tool implementation with
    factory function createWriteFileTool(app), formatSize() helper for size
    display, and ensureParentFolder() for directory creation
  src/llm/tools/createFolder.ts: Created new file implementing the create_folder
    tool with path validation, normalization, protected path blocking, and
    folder creation via Obsidian vault API
  src/llm/tools/deleteFile.ts: Created new delete_file tool that soft-deletes
    files and folders to Obsidian's trash, following the existing tool pattern
    from writeFile.ts
  src/llm/tools/moveFile.ts: "Created new move_file tool with factory function
    createMoveFileTool(app: App). Includes path normalization,
    ensureParentFolder helper, input validation, protected path checking for
    both source and destination, existence checks, and the move operation using
    app.fileManager.renameFile()."
  src/llm/tools/searchFiles.ts: Created new search_files tool with regex-based
    content search, line context extraction, protected path filtering, and
    result formatting with line numbers; Added globToRegex() function to convert
    glob patterns to RegExp, matchGlob() function to test file paths against
    patterns, and integrated glob filtering into the execute function. Updated
    the file_pattern parameter description to reflect the implemented behavior.
  src/llm/tools/listFiles.ts: Created new tool file with glob matching (reused
    pattern from searchFiles.ts), path normalization, modification time sorting,
    and formatted output with type indicators; Added import for
    findFolderInsensitive from pathUtils. Replaced direct folder lookup with
    case-insensitive version that handles ambiguous paths (multiple
    case-insensitive matches) with a helpful error message.
  src/llm/tools/getFileInfo.ts: Created new tool file with get_file_info
    implementation including formatBytes() and formatDate() helper functions,
    tool definition, and createGetFileInfoTool() factory function; Added imports
    for findFileInsensitive and findFolderInsensitive from pathUtils. Replaced
    direct adapter.stat() call with case-insensitive file/folder lookup pattern.
    Now tries file lookup first, then folder lookup, with proper ambiguity
    handling and resolved path display in output.
  src/llm/tools/pathUtils.ts: Added InsensitiveLookupResult<T> interface,
    findFileInsensitive(), and findFolderInsensitive() helper functions for
    case-insensitive file and folder lookup. Also added import for App, TFile,
    TFolder from 'obsidian'.; Added 'i' flag to RegExp constructor in
    globToRegex() function (line 66) to enable case-insensitive pattern matching
  src/processor/types.ts: "Added AgentMessageCallback type definition with JSDoc
    comment; Replaced ConversationHistory import with ConversationManager;
    Changed conversationHistory property to conversationManager in
    MessageProcessorConfig interface; Added isWaitingForResponse?: boolean field
    to ProcessResult interface; Added SmartHolePlugin import and plugin property
    to MessageProcessorConfig interface for persistence access"
  src/processor/MessageProcessor.ts: Added agentMessageCallbacks array,
    onAgentMessage() registration method, and notifyAgentMessageCallbacks()
    notification method; Added imports for createSendMessageTool and
    SendMessageContext. In processWithRetry(), created SendMessageContext with
    channel functions and registered the send_message tool with LLMService.;
    Replaced ConversationHistory import with ConversationManager and
    ConversationMessage; Changed private member to conversationManager; Updated
    processWithRetry() to use conversationManager.getContextPrompt() and record
    messages as separate user/assistant ConversationMessage entries; Removed
    triggerSummarization method and needsSummarization check; Added import for
    createEndConversationTool and EndConversationContext; registered the
    end_conversation tool in processWithRetry() after send_message tool
    registration; Added setWaitingForResponse callback to SendMessageContext
    that delegates to llmService.setWaitingForResponse().; Added
    ConversationState import, SmartHolePlugin import, CONVERSATION_STATES_KEY
    constant, plugin property, conversationStates Map,
    buildContinuationContext(), persistConversationStates(),
    loadConversationStates(), and updated processWithRetry() to restore/persist
    conversation state; Added public initialize() method, public
    cleanupStaleStates() method, made loadConversationStates() private with
    error handling, removed constructor call to loadConversationStates();
    Imported createGetConversationTool and GetConversationContext. Added
    registration of get_conversation tool in processWithRetry() method, creating
    GetConversationContext with conversationManager and registering the tool
    with llmService.
  src/processor/index.ts: Added AgentMessageCallback to module exports
  src/llm/tools/sendMessage.ts: Created new file with SendMessageContext interface
    (sendToSmartHole, sendToChatView, source properties) and SendMessageInput
    interface (message, is_question properties). Includes comprehensive JSDoc
    documentation explaining the purpose of each field.; Added imports for
    ToolHandler and Tool types, added toolDefinition constant with name
    'send_message', description, and inputSchema, and added
    createSendMessageTool factory function that creates a ToolHandler with
    validation, ChatView and SmartHole delivery logic, and appropriate return
    messages; Extended SendMessageContext interface with optional
    setWaitingForResponse callback. Updated execute function to call
    setWaitingForResponse when is_question=true.
  src/llm/index.ts: Added re-exports for createSendMessageTool,
    SendMessageContext, and SendMessageInput from tools module; Removed
    re-exports for createCreateNoteTool, createModifyNoteTool,
    createSearchNotesTool, createOrganizeNoteTool from the Vault Tools section;
    Added re-exports for createEndConversationTool and related types from tools
    module; Added exports for createGetConversationTool factory function and
    GetConversationContext, GetConversationInput types to the public LLM module
    API.
  src/main.ts: "Added import for AgentMessageCallback type and added
    onAgentMessage() method that delegates to MessageProcessor.onAgentMessage()
    for ChatView subscription; Replaced ConversationHistory import with
    ConversationManager; Changed conversationHistory property to private
    conversationManager; Updated initialization to use ConversationManager;
    Updated MessageProcessor config; Added getConversationManager() accessor
    method; Added plugin: this to MessageProcessor config; Added call to
    messageProcessor.initialize() after construction, added periodic cleanup
    interval (15 minutes), added extractSettings field for
    conversationStateTimeoutMinutes"
  src/views/ChatView.ts: Added unsubscribeAgentMessage property, subscribed to
    agent messages in onOpen() to display mid-execution messages as assistant
    messages, and added cleanup in onClose(); Updated onOpen() to use
    plugin.getConversationManager() and load messages from active conversation
    using ConversationMessage format
  src/llm/tools/createNote.ts: DELETED - old MVP tool for creating notes
  src/llm/tools/modifyNote.ts: DELETED - old MVP tool for modifying notes
  src/llm/tools/searchNotes.ts: DELETED - old MVP tool for searching notes
  src/llm/tools/organizeNotes.ts: DELETED - old MVP tool for organizing notes
  src/context/types.ts: Added ConversationMessage, Conversation, and
    PersistedConversations interfaces for the new conversation-based data model;
    Added PendingContext interface (originalMessageId, toolCallsCompleted,
    lastAgentMessage, createdAt) and ConversationState interface
    (isWaitingForResponse, pendingContext?)
  src/context/index.ts: Added exports for new types (Conversation,
    ConversationMessage, PersistedConversations) while keeping legacy type
    exports; Added export for ConversationManager class; Added exports for
    ConversationState and PendingContext types
  src/settings.ts: "Added conversationIdleTimeoutMinutes and
    maxConversationsRetained to SmartHoleSettings interface and
    DEFAULT_SETTINGS, plus UI controls in SmartHoleSettingTab.display(); Added
    conversationStateTimeoutMinutes field to SmartHoleSettings interface and
    DEFAULT_SETTINGS (default: 60)"
  src/context/ConversationManager.ts: "Created new ConversationManager class with
    conversation lifecycle management (load/save, addMessage, endConversation,
    getActiveConversation, getContextPrompt, getConversation,
    getRecentConversations, idle timeout detection, rolling limit enforcement);
    Added imports for LLMService type and extractTextContent utility from
    '../llm'. Added generateConversationSummary() method for LLM-based
    title/summary generation. Updated endConversation() to accept optional
    llmService parameter and generate summaries. Updated addMessage() to accept
    optional llmService parameter and pass it to endConversation() on idle
    timeout.; Added migration logic: imported old format types
    (PersistedHistory, HistoryEntry, ConversationSummary), added
    HISTORY_DATA_KEY constant, updated load() to check for old format and run
    migration, added migrateFromOldFormat(), convertOldEntriesToMessages(),
    buildMigrationSummary(), toPersistedFormat(), and
    loadFromPersistedConversations() methods"
  src/llm/tools/endConversation.ts: Created new file implementing the
    end_conversation tool with EndConversationContext and EndConversationInput
    interfaces, tool definition, and createEndConversationTool factory function
  src/llm/LLMService.ts: Added ConversationState import, state tracking properties
    (waitingForResponse, lastQuestionMessage, toolCallsInSession), and
    conversation state management methods (isWaitingForUserResponse,
    getConversationState, restoreConversationState, setWaitingForResponse,
    clearWaitingState). Updated executeToolCalls to track tool call count.
  src/llm/tools/getConversation.ts: Created new tool implementation with
    GetConversationContext interface, GetConversationInput type, tool
    definition, and createGetConversationTool factory function. Supports
    get-by-ID and list-recent modes with proper validation and error handling.
log: []
schema: v1.0
childrenIds:
  - E-communication-and-conversation
  - E-file-operation-tools
  - E-search-and-discovery-tools
  - E-tool-migration-and-cleanup
created: 2026-02-04T01:54:52.442Z
updated: 2026-02-04T01:54:52.442Z
---

# Agentic Architecture Overhaul

## Executive Summary

Rearchitect the SmartHole Obsidian agent from a limited tool-use model (using Obsidian Plugin API) to a fully agentic system with dedicated file operation tools, autonomous execution, and conversational capabilities. This transforms the agent from a one-shot response system to a multi-turn conversational assistant capable of complex, multi-step vault operations.

## Background and Motivation

The MVP tools have fundamental limitations:

1. **Obsidian's search is weak**: `prepareSimpleSearch()` does basic text matching. No regex, no file filtering, no context control.
2. **The modify_note tool is too restrictive**: Only supports append/prepend/replace operations. Can't do line-level edits.
3. **No tool composability**: The LLM can't combine operations in novel ways.
4. **Response handling is inflexible**: The agent can only communicate at the end. Can't provide progress updates or ask clarifying questions mid-task.
5. **Missing operations**: No delete, no metadata queries, no folder management.

## Functional Requirements

### 1. Dedicated File Operation Tools

Replace Obsidian API-based tools with purpose-built tools designed for LLM agent use.

**Design Principles:**
- Tools should have predictable, consistent output formats
- Error messages should be clear and actionable
- Output should be sized appropriately for LLM context windows
- Tools should handle edge cases gracefully (missing files, empty directories, etc.)

**File Operations:**

| Tool | Description |
|------|-------------|
| `read_file` | Read file contents with optional line range. Handles large files with truncation. Returns line numbers. |
| `write_file` | Create or overwrite a file. Auto-creates parent directories. |
| `edit_file` | Apply targeted edits without rewriting entire file. Supports search/replace and line-based operations. |
| `move` | Move or rename a file/folder. Auto-creates destination parent directories. |
| `delete` | Soft delete to Obsidian's trash (respects user's trash settings). Recoverable. |

**Search &amp; Discovery:**

| Tool | Description |
|------|-------------|
| `search_files` | Regex content search across files. Supports file pattern filtering, context lines, match limits. |
| `list_files` | Glob-based file listing. Works for both finding files and exploring folder contents. Sorted by modification time. |
| `get_file_info` | Retrieve file metadata: created date, modified date, size. Useful for "recent files" queries. |

**Folder Operations:**

| Tool | Description |
|------|-------------|
| `create_folder` | Create folder structure (including parents). For setting up organization before files exist. |

**Communication:**

| Tool | Description |
|------|-------------|
| `send_message` | Send message to user via SmartHole or ChatView. Can be called multiple times during execution. |

### 2. Protected Folders

Agent cannot read, write, or delete in protected folders:
- `.obsidian/` - Obsidian configuration (could break the app)
- `.smarthole/` - Our internal storage (inbox, trash, etc.)

Operations targeting these folders return a clear error explaining why access is denied.

### 3. Notification as a Tool

Make sending messages to the user an explicit tool the agent can invoke during execution.

**Current behavior**: Response is sent automatically after LLM processing completes.
**New behavior**: Agent explicitly decides when to communicate via `send_message`. The final text response becomes optional.

This enables:
- Progress updates during long operations
- Asking clarifying questions mid-task
- Providing partial results
- Multi-turn conversations

### 4. Agentic Autonomy

Enable fully autonomous multi-step execution with conversational state.

**Autonomous execution:**
- Agent can chain multiple tool calls without user intervention
- Current `MAX_TOOL_ITERATIONS = 10` limit remains as a safety bound
- Agent decides when task is complete

**Conversational state:**
- Agent can ask questions and wait for user responses
- Requires tracking "conversation in progress" state
- Next user message continues the conversation context
- Agent can distinguish between "task complete" and "waiting for response"

**Message flow changes:**
- Current: Message in → LLM processes → Response out (one-shot)
- New: Message in → LLM processes → (may ask question) → User responds → LLM continues → ... → Task complete

## Technical Architecture

### Current System

The current tool pattern uses factory functions returning `ToolHandler` objects:
- `toolDefinition`: Tool name, description, and JSON Schema for input
- Factory function: `create[ToolName]Tool(app: App): ToolHandler`
- Execute returns string results
- Tools registered in LLMService via `registerTool()`
- Index exports `createVaultTools(app)` factory

The MessageProcessor creates a fresh LLMService per message, registers tools, processes with retry logic, and sends notifications.

### Files to Remove

```
src/llm/tools/createNote.ts
src/llm/tools/modifyNote.ts
src/llm/tools/searchNotes.ts
src/llm/tools/organizeNotes.ts
```

### Files to Create

```
src/llm/tools/readFile.ts      # Read file contents with line ranges
src/llm/tools/writeFile.ts     # Create/overwrite files
src/llm/tools/editFile.ts      # Targeted file editing
src/llm/tools/move.ts          # Move/rename files and folders
src/llm/tools/delete.ts        # Soft delete to trash
src/llm/tools/searchFiles.ts   # Regex content search
src/llm/tools/listFiles.ts     # Glob-based file listing
src/llm/tools/getFileInfo.ts   # File metadata retrieval
src/llm/tools/createFolder.ts  # Create folder structure
src/llm/tools/sendMessage.ts   # User communication tool
src/llm/tools/protected.ts     # Shared logic for protected folder checks
src/llm/tools/getConversation.ts  # Past conversation retrieval tool
src/context/ConversationManager.ts  # Conversation lifecycle and boundaries
```

### Files to Modify

```
src/llm/tools/index.ts         # Update exports for new tools
src/llm/LLMService.ts          # Handle conversation state, sendMessage integration
src/processor/MessageProcessor.ts  # Support ongoing conversations
src/processor/types.ts         # Add conversation state types
src/context/types.ts           # Add Conversation, ConversationMessage types
src/context/ConversationHistory.ts  # Refactor to use ConversationManager
```

### Key Technical Patterns

**Protected Folder Check:**
```typescript
const PROTECTED_FOLDERS = ['.obsidian', '.smarthole'];

export function isProtectedPath(relativePath: string): boolean {
  const normalized = relativePath.replace(/\\/g, '/');
  return PROTECTED_FOLDERS.some(folder =>
    normalized === folder ||
    normalized.startsWith(`${folder}/`)
  );
}
```

**Conversation State:**
```typescript
interface ConversationState {
  isWaitingForResponse: boolean;
  pendingContext?: {
    originalMessageId: string;
    toolCallsCompleted: number;
    lastAgentMessage: string;
  };
}
```

**sendMessage Context:**
```typescript
interface SendMessageContext {
  sendToSmartHole: (message: string, priority?: 'normal' | 'high') => void;
  sendToChatView: (message: string) => void;
  source: 'websocket' | 'direct';
}
```

**Conversation Boundaries:**
```typescript
interface Conversation {
  id: string;
  startedAt: string;
  endedAt: string | null;
  title: string | null;
  summary: string | null;
  messages: ConversationMessage[];
}

interface ConversationMessage {
  id: string;
  timestamp: string;
  role: 'user' | 'assistant';
  content: string;
  toolsUsed?: string[];
}

// Idle timeout check
function isConversationExpired(conversation: Conversation, timeoutMs: number): boolean {
  if (!conversation.messages.length) return false;
  const lastMessage = conversation.messages[conversation.messages.length - 1];
  return Date.now() - new Date(lastMessage.timestamp).getTime() > timeoutMs;
}
```

## Constraints

- **Desktop Only**: Mobile not supported (file operations require Electron environment)
- **No Bash**: Dedicated tools only, no bash fallback
- **Safety Limits**: MAX_TOOL_ITERATIONS = 10 remains in place
- **Soft Delete**: Uses `app.vault.trash()` (respects user settings)
- **No RAG**: Regex search is sufficient; no vector search

## Out of Scope

- Bash command execution (may revisit if dedicated tools prove insufficient)
- Mobile support (desktop only for file operations)
- Async/background operations
- Multiple LLM providers (architecture supports it, but not part of this work)
- RAG/vector search (regex search is sufficient for now)

## Acceptance Criteria

### File Reading
- [ ] `read_file` reads file contents
- [ ] Supports optional `start_line` and `end_line` parameters
- [ ] Returns line numbers with content
- [ ] Handles large files with smart truncation (configurable limit)
- [ ] Clear error for non-existent files

### File Writing
- [ ] `write_file` creates new files
- [ ] `write_file` overwrites existing files
- [ ] Auto-creates parent directories
- [ ] Returns confirmation with file path and size

### File Editing
- [ ] `edit_file` supports search/replace operations
- [ ] `edit_file` supports line-based insertions
- [ ] Handles "not found" cases with clear error
- [ ] Returns diff or summary of changes made

### Move/Rename
- [ ] `move` renames files
- [ ] `move` moves files to different folders
- [ ] `move` works for folders too
- [ ] Auto-creates destination parent directories
- [ ] Clear error if source doesn't exist

### Delete
- [ ] `delete` soft deletes to Obsidian trash
- [ ] Uses `app.vault.trash()` API (respects user settings)
- [ ] Returns confirmation of what was deleted
- [ ] Clear error if file doesn't exist

### Search
- [ ] `search_files` searches content with regex patterns
- [ ] Supports file pattern filtering (e.g., `*.md`, `Projects/**`)
- [ ] Supports context lines (before/after match)
- [ ] Limits results to prevent overwhelming output
- [ ] Returns file paths with matching excerpts

### List Files
- [ ] `list_files` supports glob patterns
- [ ] Returns files sorted by modification time (most recent first)
- [ ] Includes basic info (path, type: file/folder)
- [ ] Handles empty directories gracefully

### File Info
- [ ] `get_file_info` returns created date, modified date, size
- [ ] Works for both files and folders
- [ ] Clear error for non-existent paths

### Create Folder
- [ ] `create_folder` creates single folder
- [ ] Creates parent directories if needed
- [ ] Returns confirmation or note if already exists

### Protected Folders
- [ ] Operations on `.obsidian/` are blocked with clear error
- [ ] Operations on `.smarthole/` are blocked with clear error
- [ ] Protection applies to all file/folder tools

### Communication
- [ ] `send_message` sends message to user via SmartHole
- [ ] `send_message` displays in ChatView for direct messages
- [ ] Agent can call `send_message` multiple times during execution
- [ ] Messages appear in real-time (not batched until end)

### Conversation State
- [ ] Agent can ask questions and wait for response
- [ ] Conversation state persists between messages
- [ ] Next user message continues existing conversation context
- [ ] Clear distinction between "task complete" and "awaiting response"
- [ ] Safety limit on tool iterations remains in place

### Conversation Boundaries
- [ ] Configurable idle timeout for conversation boundaries
- [ ] Agent can explicitly end conversations
- [ ] Immediate summary generation on conversation end
- [ ] Rolling retention limit (default 1000, configurable)
- [ ] `get_conversation` tool for retrieving past conversations
- [ ] Current conversation only in LLM context (not full history)

### Cleanup
- [ ] Old MVP tools removed (createNote, modifyNote, searchNotes, organizeNotes)
- [ ] No references to removed tools in codebase
- [ ] Tests updated for new tool set