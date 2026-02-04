---
id: P-agentic-architecture-overhaul
title: Agentic Architecture Overhaul
status: open
priority: medium
parent: none
prerequisites: []
affectedFiles: {}
log: []
schema: v1.0
childrenIds: []
created: 2026-02-04T00:35:58.132Z
updated: 2026-02-04T00:35:58.132Z
---

# Agentic Architecture Overhaul

## Executive Summary

Rearchitect the SmartHole Obsidian agent from a limited tool-use model (using Obsidian Plugin API) to a fully agentic system with direct filesystem access, autonomous execution, and conversational capabilities.

## Background & Motivation

The MVP tools got us to a working state but have fundamental limitations:

1. **Obsidian's search is weak**: `prepareSimpleSearch()` does basic text matching. No regex, no file filtering, no context control. Real note management needs grep-level search.
2. **The modify_note tool is too restrictive**: Only supports append/prepend/replace operations. Can't do line-level edits, can't handle complex transformations.
3. **No tool composability**: The LLM can't combine operations in novel ways. It's limited to the exact operations we defined.
4. **Response handling is inflexible**: The agent can only communicate at the end. Can't provide progress updates, can't ask clarifying questions mid-task.

## Functional Requirements

### 1. Bash Command Execution
Replace Obsidian API-based tools with direct filesystem access via bash commands.

**Constraints:**
- **Vault-scoped**: All commands run with working directory set to the vault root; cannot access files outside the vault
- **Command allowlist**: Only allow safe commands (grep, find, cat, head, tail, sed, awk, ls, etc.); deny dangerous operations (rm -rf, chmod, chown, etc.)
- **Synchronous execution**: Commands run and agent waits for result before proceeding

### 2. File Operation Abstractions
Provide safe, high-level tools alongside raw bash for common operations:
- `read_file` - Read file contents with optional line range
- `write_file` - Create or overwrite a file with content
- `edit_file` - Apply targeted edits (search/replace, line insertions) without rewriting entire file
- `list_files` - List files/directories with glob patterns

### 3. Notification as a Tool
Make sending messages to the user an explicit tool the agent can invoke during execution:
- `send_message` tool sends message back to SmartHole or displays in ChatView
- Agent can call multiple times during execution
- Used for: progress updates, asking questions, providing partial results, final answers

### 4. Agentic Autonomy
Enable fully autonomous multi-step execution with conversational state:
- Agent can chain multiple tool calls without user intervention
- Agent can ask questions and wait for user responses
- Track "conversation in progress" state
- Distinguish between "task complete" and "waiting for response"

## Technical Requirements

### Files to Remove
```
src/llm/tools/createNote.ts
src/llm/tools/modifyNote.ts
src/llm/tools/searchNotes.ts
src/llm/tools/organizeNotes.ts
```

### Files to Create
```
src/llm/tools/bash.ts          # Vault-scoped bash execution with allowlist
src/llm/tools/readFile.ts      # Safe file reading
src/llm/tools/writeFile.ts     # Safe file writing
src/llm/tools/editFile.ts      # Targeted file editing
src/llm/tools/listFiles.ts     # Directory listing with globs
src/llm/tools/sendMessage.ts   # Notification/message tool
```

### Files to Modify
```
src/llm/tools/index.ts         # Update exports for new tools
src/llm/LLMService.ts          # Handle conversation state, sendMessage integration
src/processor/MessageProcessor.ts  # Support ongoing conversations
src/processor/types.ts         # Add conversation state types
```

## Architecture Decisions

- Use Node.js `child_process.exec` for bash execution with vault as cwd
- Two-layer command security: allowlist base commands + block dangerous patterns
- Pass callback to sendMessage tool for real-time message delivery
- Store conversation state in PersistedHistory or separate storage

## Constraints

- Desktop only (bash requires Electron environment)
- Synchronous command execution only
- No RAG/vector search (plain text search via grep is sufficient)
- Must maintain existing SmartHole protocol compatibility

## Acceptance Criteria

### Bash Execution
- [ ] Bash tool executes commands within vault directory only
- [ ] Commands outside vault are rejected with clear error
- [ ] Dangerous commands (rm -rf, chmod, etc.) are blocked
- [ ] Allowlist is configurable or well-documented
- [ ] Command output is captured and returned to agent
- [ ] Reasonable timeout prevents hung commands (e.g., 30 seconds)

### File Operations
- [ ] `read_file` reads file contents, supports line ranges
- [ ] `write_file` creates/overwrites files, creates parent directories
- [ ] `edit_file` applies targeted changes without full rewrite
- [ ] `list_files` lists files with glob pattern support
- [ ] All operations are vault-scoped (cannot escape vault directory)

### Notification Tool
- [ ] `send_message` tool sends message to user via SmartHole or ChatView
- [ ] Agent can call `send_message` multiple times during execution
- [ ] Messages appear in real-time (not batched until end)
- [ ] Works for both WebSocket and direct message sources

### Agentic Behavior
- [ ] Agent executes multi-step tool chains autonomously
- [ ] Agent can ask questions and receive follow-up responses
- [ ] Conversation state persists between messages when agent is "waiting"
- [ ] Clear distinction between "task complete" and "awaiting response"
- [ ] Safety limit on tool iterations remains in place

### Cleanup
- [ ] Old MVP tools removed (createNote, modifyNote, searchNotes, organizeNotes)
- [ ] No references to removed tools in codebase
- [ ] Tests updated for new tool set