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
    functions
  src/llm/tools/readFile.ts: Created new read_file tool with path validation,
    protected path checking, line number formatting, optional line range
    filtering, and smart truncation for large files
  src/llm/tools/index.ts: Added import and export for createReadFileTool, added to
    createVaultTools() array; Added import and export for createEditFileTool,
    added to createVaultTools array; Added import and export for
    createEditFileTool, added to createVaultTools array (completed in
    T-implement-edit-file-tool-with)
  src/llm/tools/editFile.ts: Created new edit_file tool with search/replace
    functionality, supporting first occurrence or all occurrences replacement,
    protected path validation, and atomic file operations
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
```

### Files to Modify

```
src/llm/tools/index.ts         # Update exports for new tools
src/llm/LLMService.ts          # Handle conversation state, sendMessage integration
src/processor/MessageProcessor.ts  # Support ongoing conversations
src/processor/types.ts         # Add conversation state types
src/context/types.ts           # Add conversation state to persisted data
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

### Cleanup
- [ ] Old MVP tools removed (createNote, modifyNote, searchNotes, organizeNotes)
- [ ] No references to removed tools in codebase
- [ ] Tests updated for new tool set