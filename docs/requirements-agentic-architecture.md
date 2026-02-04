# Requirements: Agentic Architecture Overhaul

## Overview

Rearchitect the SmartHole Obsidian agent from a limited tool-use model (using Obsidian Plugin API) to a fully agentic system with direct filesystem access, autonomous execution, and conversational capabilities.

---

## What

### 1. Bash Command Execution

Replace Obsidian API-based tools with direct filesystem access via bash commands.

**Constraints:**
- **Vault-scoped**: All commands run with working directory set to the vault root; cannot access files outside the vault
- **Command allowlist**: Only allow safe commands (grep, find, cat, head, tail, sed, awk, ls, etc.); deny dangerous operations (rm -rf, chmod, chown, etc.)
- **Synchronous execution**: Commands run and agent waits for result before proceeding

**Rationale**: Obsidian's `prepareSimpleSearch()` and vault API are insufficient for effective searching and editing. Since notes are just markdown files, direct filesystem access enables:
- Grep/ripgrep-style pattern matching across files
- Sed-like inline edits
- Find with complex predicates
- Novel tool combinations the agent can discover

### 2. File Operation Abstractions

Provide safe, high-level tools alongside (or instead of) raw bash for common operations.

**Tools to provide:**
- `read_file` - Read file contents with optional line range
- `write_file` - Create or overwrite a file with content
- `edit_file` - Apply targeted edits (search/replace, line insertions) without rewriting entire file
- `list_files` - List files/directories with glob patterns

**Design choice**: As an AI agent, I'd prefer having both safe abstractions AND bash access. The abstractions handle 80% of cases cleanly (read a file, write a file), while bash handles edge cases and novel patterns. However, per user preference, we're replacing the old tools entirely - so these abstractions become the primary interface with bash as the power-user escape hatch.

### 3. Notification as a Tool

Make sending messages to the user an explicit tool the agent can invoke during execution.

**Tool: `send_message`**
- Sends a message back to SmartHole (or displays in ChatView for direct messages)
- Agent can call this multiple times during execution
- Used for: progress updates, asking questions, providing partial results, final answers

**Current behavior**: Response is sent automatically after LLM processing completes. The agent has no control over when or how messages are sent.

**New behavior**: Agent explicitly decides when to communicate. The final text response becomes optional - agent might only communicate via `send_message` calls.

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

---

## Why

### Context

The MVP tools got us to a working state but have fundamental limitations:

1. **Obsidian's search is weak**: `prepareSimpleSearch()` does basic text matching. No regex, no file filtering, no context control. Real note management needs grep-level search.

2. **The modify_note tool is too restrictive**: Only supports append/prepend/replace operations. Can't do line-level edits, can't handle complex transformations.

3. **No tool composability**: The LLM can't combine operations in novel ways. It's limited to the exact operations we defined.

4. **Response handling is inflexible**: The agent can only communicate at the end. Can't provide progress updates, can't ask clarifying questions mid-task.

### Why Not Claude Agent SDK?

Attempted but doesn't work in Electron plugin environment. Also, it would lock the solution to Claude - we want provider flexibility.

### Design Principles

Following patterns from successful coding agents (Claude Code, Cursor, etc.):
- Direct filesystem access over abstraction layers
- Tools that enable novel use, not just predefined operations
- Agentic loops where the AI controls the flow
- Conversation as a first-class capability

---

## Done

### Acceptance Criteria

**Bash Execution**
- [ ] Bash tool executes commands within vault directory only
- [ ] Commands outside vault are rejected with clear error
- [ ] Dangerous commands (rm -rf, chmod, etc.) are blocked
- [ ] Allowlist is configurable or well-documented
- [ ] Command output is captured and returned to agent
- [ ] Reasonable timeout prevents hung commands (e.g., 30 seconds)

**File Operations**
- [ ] `read_file` reads file contents, supports line ranges
- [ ] `write_file` creates/overwrites files, creates parent directories
- [ ] `edit_file` applies targeted changes without full rewrite
- [ ] `list_files` lists files with glob pattern support
- [ ] All operations are vault-scoped (cannot escape vault directory)

**Notification Tool**
- [ ] `send_message` tool sends message to user via SmartHole or ChatView
- [ ] Agent can call `send_message` multiple times during execution
- [ ] Messages appear in real-time (not batched until end)
- [ ] Works for both WebSocket and direct message sources

**Agentic Behavior**
- [ ] Agent executes multi-step tool chains autonomously
- [ ] Agent can ask questions and receive follow-up responses
- [ ] Conversation state persists between messages when agent is "waiting"
- [ ] Clear distinction between "task complete" and "awaiting response"
- [ ] Safety limit on tool iterations remains in place

**Cleanup**
- [ ] Old MVP tools removed (createNote, modifyNote, searchNotes, organizeNotes)
- [ ] No references to removed tools in codebase
- [ ] Tests updated for new tool set

---

## Technical Notes

### Bash Execution Implementation

Use Node.js `child_process.spawn` or `child_process.exec`:

```typescript
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

// Execute with vault as cwd, capture output
const { stdout, stderr } = await execAsync(command, {
  cwd: vaultPath,
  timeout: 30000,
  maxBuffer: 1024 * 1024, // 1MB output limit
});
```

### Command Allowlist Strategy

Two-layer approach:
1. **Allowlist base commands**: `grep`, `find`, `cat`, `head`, `tail`, `ls`, `sed`, `awk`, `wc`, `sort`, `uniq`, `diff`, `echo`, `mkdir`, `mv`, `cp`, `touch`
2. **Block dangerous patterns**: Commands containing `..`, absolute paths outside vault, pipes to dangerous commands, etc.

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

The tool needs access to the notification channel. Options:
1. Pass connection/callback reference when creating tools
2. Use event emitter pattern
3. Return special result type that MessageProcessor interprets

Recommendation: Pass a callback when creating the tool:

```typescript
function createSendMessageTool(
  sendFn: (message: string, priority?: 'normal' | 'high') => void
): ToolHandler
```

---

## Open Questions

None - requirements are fully specified based on user input.

---

## Out of Scope

- Mobile support (bash requires desktop/Electron)
- Async/background command execution
- Multiple LLM providers (architecture supports it, but not part of this work)
- RAG/vector search (plain text search via grep is sufficient)
