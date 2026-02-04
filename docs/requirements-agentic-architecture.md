# Requirements: Agentic Architecture Overhaul

## Overview

Rearchitect the SmartHole Obsidian agent from a limited tool-use model (using Obsidian Plugin API) to a fully agentic system with dedicated file operation tools, autonomous execution, and conversational capabilities.

---

## What

### 1. Dedicated File Operation Tools

Replace Obsidian API-based tools with purpose-built tools designed for LLM agent use. No bash fallback - dedicated tools only, designed with predictable output formats, clear error handling, and context-window-friendly responses.

**Design principles:**
- Tools should have predictable, consistent output formats
- Error messages should be clear and actionable
- Output should be sized appropriately for LLM context windows
- Tools should handle edge cases gracefully (missing files, empty directories, etc.)

**Rationale**: Following Claude Code's pattern of preferring dedicated tools over bash equivalents. Dedicated tools provide:
- Predictable output parsing
- Better error handling
- Fewer agent mistakes (no sed syntax errors, platform differences)
- Token-efficient self-documenting parameters

### 2. Complete Tool Set

**File Operations:**

| Tool | Description |
|------|-------------|
| `read_file` | Read file contents with optional line range. Handles large files with truncation. Returns line numbers. |
| `write_file` | Create or overwrite a file. Auto-creates parent directories. |
| `edit_file` | Apply targeted edits without rewriting entire file. Supports search/replace and line-based operations. |
| `move` | Move or rename a file/folder. Auto-creates destination parent directories. |
| `delete` | Soft delete to Obsidian's trash (respects user's trash settings). Recoverable. |

**Search & Discovery:**

| Tool | Description |
|------|-------------|
| `search_files` | Regex content search across files. Supports file pattern filtering (case-insensitive), context lines, match limits. |
| `list_files` | Glob-based file listing (case-insensitive path and pattern matching). Works for both finding files and exploring folder contents. Sorted by modification time. |
| `get_file_info` | Retrieve file metadata: created date, modified date, size. Case-insensitive path lookup. Useful for "recent files" queries. |

Note: Read operations (`read_file`, `list_files`, `get_file_info`) use case-insensitive path resolution to improve usability with speech-to-text input. If the user says "list files in projects", it will find "Projects" even if the exact casing differs.

**Folder Operations:**

| Tool | Description |
|------|-------------|
| `create_folder` | Create folder structure (including parents). For setting up organization before files exist. |

**Communication:**

| Tool | Description |
|------|-------------|
| `send_message` | Send message to user via SmartHole or ChatView. Can be called multiple times during execution. |
| `get_conversation` | Retrieve past conversation details by ID, or list recent conversations with summaries. |

### 3. Protected Folders

Agent cannot read, write, or delete in protected folders:
- `.obsidian/` - Obsidian configuration (could break the app)
- `.smarthole/` - Our internal storage (inbox, trash, etc.)

Operations targeting these folders return a clear error explaining why access is denied.

### 4. Notification as a Tool

Make sending messages to the user an explicit tool the agent can invoke during execution.

**Current behavior**: Response is sent automatically after LLM processing completes. The agent has no control over when or how messages are sent.

**New behavior**: Agent explicitly decides when to communicate via `send_message`. The final text response becomes optional - agent might only communicate via tool calls. This enables:
- Progress updates during long operations
- Asking clarifying questions mid-task
- Providing partial results
- Multi-turn conversations

### 5. Agentic Autonomy

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

### 6. Conversation Boundaries

Group message exchanges into discrete conversations to manage context efficiently.

**Conversation lifecycle:**
- Messages within an idle timeout window belong to the same conversation
- Agent can explicitly end a conversation (task complete, topic change)
- User can request the agent end a conversation
- New conversations start automatically after timeout or explicit ending

**Context management:**
- Only the current conversation's full history is included in LLM context
- Past conversations appear as summaries accessible via tool, not in system prompt
- Reduces token usage for long-term users with extensive history

**Summary generation:**
- When a conversation ends, a title and summary are generated immediately
- Uses the user's configured model for consistency
- Summaries capture key topics, actions taken, and outcomes

**Retention:**
- Rolling limit of conversations retained (default: 1000)
- Oldest conversations deleted when limit exceeded
- Configurable via plugin settings

---

## Where

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

---

## Why

### Context

The MVP tools got us to a working state but have fundamental limitations:

1. **Obsidian's search is weak**: `prepareSimpleSearch()` does basic text matching. No regex, no file filtering, no context control. Real note management needs grep-level search.

2. **The modify_note tool is too restrictive**: Only supports append/prepend/replace operations. Can't do line-level edits, can't handle complex transformations.

3. **No tool composability**: The LLM can't combine operations in novel ways. It's limited to the exact operations we defined.

4. **Response handling is inflexible**: The agent can only communicate at the end. Can't provide progress updates, can't ask clarifying questions mid-task.

5. **Missing operations**: No delete, no metadata queries, no folder management.

### Why Not Bash?

Initial design considered bash with allowlist, but following Claude Code's evolution:
- Dedicated tools have predictable output formats
- LLMs make fewer mistakes with dedicated tools than bash syntax
- Easier to add protection (folder restrictions, size limits)
- Can learn what's missing and add new tools vs. allowing arbitrary commands

We can revisit bash as a fallback if dedicated tools prove insufficient.

### Design Principles

Following patterns from successful coding agents:
- Purpose-built tools designed for LLM consumption
- Predictable output formats and clear errors
- Agentic loops where the AI controls the flow
- Conversation as a first-class capability

---

## Done

### Acceptance Criteria

**File Reading**
- [x] `read_file` reads file contents
- [x] Supports optional `start_line` and `end_line` parameters
- [x] Returns line numbers with content
- [x] Handles large files with smart truncation (configurable limit)
- [x] Clear error for non-existent files

**File Writing**
- [ ] `write_file` creates new files
- [ ] `write_file` overwrites existing files
- [ ] Auto-creates parent directories
- [ ] Returns confirmation with file path and size

**File Editing**
- [ ] `edit_file` supports search/replace operations
- [ ] `edit_file` supports line-based insertions
- [ ] Handles "not found" cases with clear error
- [ ] Returns diff or summary of changes made

**Move/Rename**
- [x] `move` renames files
- [x] `move` moves files to different folders
- [x] `move` works for folders too
- [x] Auto-creates destination parent directories
- [x] Clear error if source doesn't exist

**Delete**
- [ ] `delete` soft deletes to Obsidian trash
- [ ] Uses `app.vault.trash()` API (respects user settings)
- [ ] Returns confirmation of what was deleted
- [ ] Clear error if file doesn't exist

**Search**
- [ ] `search_files` searches content with regex patterns
- [ ] Supports file pattern filtering (e.g., `*.md`, `Projects/**`)
- [ ] Supports context lines (before/after match)
- [ ] Limits results to prevent overwhelming output
- [ ] Returns file paths with matching excerpts

**List Files**
- [ ] `list_files` supports glob patterns
- [ ] Returns files sorted by modification time (most recent first)
- [ ] Includes basic info (path, type: file/folder)
- [ ] Handles empty directories gracefully

**File Info**
- [ ] `get_file_info` returns created date, modified date, size
- [ ] Works for both files and folders
- [ ] Clear error for non-existent paths

**Create Folder**
- [ ] `create_folder` creates single folder
- [ ] Creates parent directories if needed
- [ ] Returns confirmation or note if already exists

**Protected Folders**
- [x] Operations on `.obsidian/` are blocked with clear error
- [x] Operations on `.smarthole/` are blocked with clear error
- [ ] Protection applies to all file/folder tools

**Communication**
- [ ] `send_message` sends message to user via SmartHole
- [ ] `send_message` displays in ChatView for direct messages
- [ ] Agent can call `send_message` multiple times during execution
- [ ] Messages appear in real-time (not batched until end)

**Conversation State**
- [ ] Agent can ask questions and wait for response
- [ ] Conversation state persists between messages
- [ ] Next user message continues existing conversation context
- [ ] Clear distinction between "task complete" and "awaiting response"
- [ ] Safety limit on tool iterations remains in place

**Conversation Boundaries**
- [ ] Configurable idle timeout for conversation boundaries
- [ ] Agent can explicitly end conversations
- [ ] Immediate summary generation on conversation end
- [ ] Rolling retention limit (default 1000, configurable)
- [ ] `get_conversation` tool for retrieving past conversations
- [ ] Current conversation only in LLM context (not full history)

**Cleanup**
- [x] Old MVP tools removed (createNote, modifyNote, searchNotes, organizeNotes)
- [x] No references to removed tools in codebase
- [ ] Tests updated for new tool set

---

## Technical Notes

### Protected Folder Check

Shared utility for all tools. Protection is case-insensitive to prevent bypassing via `.Obsidian/` or `.SMARTHOLE/`:

```typescript
// src/llm/tools/protected.ts
const PROTECTED_FOLDERS = ['.obsidian', '.smarthole'];

export function isProtectedPath(relativePath: string): boolean {
  const normalized = normalizePath(relativePath);
  const normalizedLower = normalized.toLowerCase();
  return PROTECTED_FOLDERS.some(folder =>
    normalizedLower === folder ||
    normalizedLower.startsWith(`${folder}/`)
  );
}

export function assertNotProtected(relativePath: string): void {
  if (isProtectedPath(relativePath)) {
    throw new Error(
      `Access denied: Cannot access files in '${folder}/' directory (protected system folder)`
    );
  }
}
```

### Conversation State

Add to `PersistedHistory` or separate storage:

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

When agent sends a message that ends with a question or explicitly signals "waiting", set `isWaitingForResponse = true`. Next incoming message continues that context.

### sendMessage Tool Integration

The tool needs access to the notification channel. Pass a callback when creating the tool:

```typescript
interface SendMessageContext {
  sendToSmartHole: (message: string, priority?: 'normal' | 'high') => void;
  sendToChatView: (message: string) => void;
  source: 'websocket' | 'direct';
}

function createSendMessageTool(context: SendMessageContext): ToolHandler
```

### Soft Delete Implementation

Use Obsidian's built-in trash API:

```typescript
// The second parameter controls system trash vs .trash folder
// Based on user's Obsidian settings
await app.vault.trash(file, false);
```

### Search Implementation

Since we're not using bash grep, implement search using Node.js:

```typescript
// Options:
// 1. Read files and match with JS regex (simple but potentially slow)
// 2. Use a library like 'glob' + 'fast-glob' for file finding
// 3. Use Node's fs.readdir with manual filtering

// For MVP, option 1 is fine - vault sizes are typically small
// Can optimize later if needed
```

---

## Open Questions

None - requirements are fully specified based on user input.

---

## Out of Scope

- Bash command execution (may revisit if dedicated tools prove insufficient)
- Mobile support (desktop only for file operations)
- Async/background operations
- Multiple LLM providers (architecture supports it, but not part of this work)
- RAG/vector search (regex search is sufficient for now)
