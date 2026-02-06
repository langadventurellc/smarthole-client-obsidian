# Git Version Control for Vault Changes

## Overview

Integrate git version control into the SmartHole plugin to track all vault changes (both agent and user-initiated), provide semantically meaningful commit history, and give the agent tools to search that history when asked by the user.

## Motivation

When the agent modifies vault files, there's currently no safety net — changes can't be reviewed, compared, or reverted. Users also have no visibility into *why* a note changed over time. Git integration provides:

- **Safety**: Every change is tracked and recoverable
- **Transparency**: Commit messages explain what changed and why
- **Intelligence**: The agent can search history to answer questions about past changes

## Feature: Git Repository Management

### Opt-in Initialization

- **Off by default.** Git version control is a settings toggle (disabled by default).
- When enabled for the first time, the plugin initializes a git repo in the vault root if one doesn't already exist (`git init` equivalent via isomorphic-git).
- If a repo already exists, the plugin uses it as-is.
- When disabled, all git tools are removed from the agent's available tools. The repo remains but the plugin stops interacting with it.

### .gitignore Seeding

- On first initialization, if no `.gitignore` exists, the plugin creates one with sensible defaults:
  - `.obsidian/` (Obsidian internal settings)
  - `.smarthole/` (SmartHole internal data)
  - `.trash/` (Obsidian trash)
  - Common OS files (`.DS_Store`, `Thumbs.db`, `desktop.ini`)
- If `.gitignore` already exists, the plugin does **not** modify it.
- After initial creation, the user owns `.gitignore` — the plugin never modifies it again.

### Implementation: isomorphic-git

- Use [isomorphic-git](https://isomorphic-git.org/) for all git operations. No dependency on the user having git installed.
- isomorphic-git runs in pure JS and works in Electron/Node.js environments.
- File system access via Node.js `fs` module (available in Obsidian's Electron runtime).

## Feature: Automatic Commits

### Trigger: After Message Processing

- After the agent finishes processing a complete message/request (the full tool loop), the plugin automatically commits all changes.
- This includes:
  - Files the agent modified during this interaction (via vault tools)
  - Any uncommitted user manual edits that accumulated since the last commit
- If there are no changes to commit, skip silently.

### Commit Message Format (Structured)

Commit messages use a structured format for parseability and semantic search:

```
type(scope): summary

[body - detailed description]

---
smarthole-metadata:
  conversation: <conversation-id>
  tools-used: [list of tools]
  files-affected: [list of files]
  source: agent|mixed  (agent-only or agent+user changes)
```

**Type values**: `vault` (file changes), `organize` (moves/renames/folders), `cleanup` (deletions)

**The agent generates the summary and body** — these should be human-readable and explain *what* changed and *why*. The metadata block is added automatically by the plugin.

**For mixed commits** (agent + user changes): The summary should note both. The body should describe what the agent did and briefly summarize the user's manual changes (e.g., "User also edited meeting-notes.md and created new-idea.md").

### Commit Authoring

- Agent commits: author name = plugin client name from settings (e.g., "SmartHole Agent"), email = `smarthole@local`
- The git committer identity is not configurable in settings for now (keep it simple).

## Feature: Git History Tools for the Agent

### Tool: `search_git_history`

Search commit history by message content, file path, date range, or combination.

**Input parameters:**
- `query` (string, optional): Text to search in commit messages
- `file_path` (string, optional): Filter to commits affecting a specific file
- `max_results` (number, optional, default 10): Limit number of results
- `since` (string, optional): ISO date string, only commits after this date
- `until` (string, optional): ISO date string, only commits before this date

**Returns:** Array of matching commits with: hash, message, date, files changed (summary).

At least one of `query` or `file_path` must be provided.

### Tool: `view_file_history`

View the change history of a specific file, including diffs.

**Input parameters:**
- `file_path` (string, required): Path to the file
- `max_results` (number, optional, default 5): Number of commits to show
- `include_diff` (boolean, optional, default false): Include the actual diff content

**Returns:** List of commits that modified this file, with dates, messages, and optionally the diff for each.

### Tool: `view_commit`

View the full details of a specific commit.

**Input parameters:**
- `commit_hash` (string, required): The commit hash to inspect

**Returns:** Full commit message, date, list of files changed with their diffs.

### Tool Availability

- These tools are **only registered** when git version control is enabled in settings.
- They are registered alongside vault tools in the message processor pipeline.
- They follow the existing tool factory pattern (`ToolHandler` with `definition` and `execute`).

## Settings

New settings under a "Version Control" section:

| Setting | Type | Default | Description |
|---------|------|---------|-------------|
| Enable Git Version Control | toggle | `false` | Master toggle. Initializes repo on first enable. |
| Auto-commit after processing | toggle | `true` | Commit automatically after agent message processing. Only visible when git is enabled. |

Keep settings minimal for now. Remote push and additional configuration can be added later.

## Architecture

### New Module: `src/git/`

- `GitService.ts` — Core service wrapping isomorphic-git operations (init, add, commit, log, diff, status)
- `types.ts` — Git-related type definitions

### New Tools: `src/llm/tools/git/`

- `searchGitHistory.ts` — Implements `search_git_history` tool
- `viewFileHistory.ts` — Implements `view_file_history` tool
- `viewCommit.ts` — Implements `view_commit` tool
- `index.ts` — Aggregator function `createGitTools(gitService)`

### Integration Points

1. **Settings** (`src/settings.ts`): Add git toggle and auto-commit toggle
2. **Plugin lifecycle** (`src/main.ts`): Initialize `GitService` on load if enabled; reinitialize on settings change
3. **Message Processor** (`src/processor/MessageProcessor.ts`):
   - Conditionally register git tools when enabled
   - After message processing completes, trigger auto-commit if enabled
   - Pass agent context (conversation ID, tools used, files affected) to GitService for commit metadata
4. **Protected paths** (`src/llm/tools/protected.ts`): Add `.git/` to protected paths so the agent can't directly modify the repo

### Commit Flow

```
Message Processing Completes
  → Collect context (conversation ID, tools used, files modified)
  → Ask LLM to generate commit summary (lightweight call with file list + conversation context)
  → GitService.commitAll(message, metadata)
    → git add . (stage all changes)
    → git commit with structured message
```

**Generating the commit message:** After the main LLM processing loop completes, make a lightweight LLM call specifically to generate the commit message. Provide it with: the list of files changed, the original user request, and a summary of what tools were used. This keeps commit messages contextual and meaningful without burdening the main conversation.

## Non-Goals (Deferred)

- **Remote push/pull**: Will be added as a separate feature later. Requires auth configuration (tokens, SSH keys).
- **Revert capability**: The agent currently has read-only access to git history. Revert tools may be added later.
- **Branch management**: No branching, merging, or checkout. Single-branch (main/default) only.
- **Conflict resolution**: Not needed without remote sync or branching.
- **Configurable commit author**: Keep it simple with a fixed author for now.

## Definition of Done

- [ ] `isomorphic-git` added as a dependency
- [ ] Git version control toggle in settings (off by default)
- [ ] Repo initialization on first enable (with .gitignore seeding)
- [ ] Automatic commits after message processing with structured, LLM-generated messages
- [ ] `search_git_history` tool available to agent when enabled
- [ ] `view_file_history` tool available to agent when enabled
- [ ] `view_commit` tool available to agent when enabled
- [ ] `.git/` added to protected paths
- [ ] Git tools not registered when feature is disabled
- [ ] Existing tests pass; new tests for GitService and git tools
