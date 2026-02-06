# Git Version Control

Optional git integration that tracks vault changes using `isomorphic-git` (pure-JS, no external git binary required). When enabled, the plugin initializes a git repository in the vault, auto-commits after agent processing, and provides the agent with tools to search commit history.

## GitService

Core service wrapping `isomorphic-git` for repository operations. Located in `src/git/`.

### Initialization

```typescript
import { GitService } from "./git";

const basePath = (app.vault.adapter as any).basePath as string;
const gitService = new GitService(basePath);
await gitService.initialize();  // git init (skipped if .git/ already exists)
gitService.seedGitignore();     // creates .gitignore if not present
```

The vault base path is obtained via `(app.vault.adapter as any).basePath`, which is safe because the plugin is desktop-only (`isDesktopOnly: true`). GitService uses Node.js `fs` directly (available in Obsidian's Electron runtime).

### Default .gitignore

On first initialization, a `.gitignore` is created with:

```
.obsidian/
.smarthole/
.trash/
.DS_Store
Thumbs.db
desktop.ini
```

If a `.gitignore` already exists, it is left untouched.

### Repository Operations

| Method | Description |
|--------|-------------|
| `initialize()` | Init repo if `.git/` does not exist |
| `isInitialized()` | Check if `.git/` directory exists |
| `seedGitignore()` | Create default `.gitignore` if missing |
| `hasChanges()` | Check if working directory has uncommitted changes |
| `getChangedFiles()` | Return file paths with uncommitted changes |
| `commitAll(options)` | Stage all changes and commit (returns SHA or null) |
| `formatCommitMessage(options)` | Build structured commit message with metadata |
| `log(options)` | Retrieve commit log entries (optional file filter) |
| `searchCommits(options)` | Search by message text, file path, date range |
| `getCommitDetails(hash)` | Get full commit info including file diffs |
| `getFileDiffs(hash)` | Compute files changed by comparing parent tree |

### Commit Message Format

```
type(vault): summary

body

---
smarthole-metadata:
  conversation: <conversation-id>
  tools-used: [tool1, tool2]
  files-affected: [file1.md, file2.md]
  source: agent|mixed
```

Where `type` is one of: `vault` (file changes), `organize` (moves/renames/folders), `cleanup` (deletions).

## Auto-Commit

After successful message processing, the `MessageProcessor` optionally commits vault changes. This is a fire-and-forget async operation that never blocks the user's response.

### Requirements

Both must be true for auto-commit to trigger:
- `enableGitVersionControl` is enabled in settings
- `autoCommitAfterProcessing` is enabled in settings

### Flow

1. Check `gitService.hasChanges()` -- skip if no changes
2. Get changed file list via `gitService.getChangedFiles()`
3. Generate commit message via a lightweight Haiku LLM call (fresh `LLMService`, no tools)
4. Call `gitService.commitAll()` with structured metadata
5. Errors are caught and logged silently

### Commit Message Generation

A separate `LLMService` is created with Haiku (`claude-haiku-4-5-20251001`) regardless of the user's model setting. The LLM receives the user's original request, tools used, and files changed to produce a conventional commit message. The commit type (`vault`/`organize`/`cleanup`) is inferred from the LLM output.

## Git History Tools

Three tools are conditionally registered with the LLM when git is enabled. They follow the same factory pattern as vault tools.

### search_git_history

Search commit history by message content, file path, date range, or combination.

**Input Schema:**

```typescript
{
  query?: string,         // Text to search in commit messages
  file_path?: string,     // Filter to commits affecting this file
  max_results?: integer,  // Maximum commits to return (default: 10)
  since?: string,         // ISO date string (e.g., "2026-01-15")
  until?: string          // ISO date string
}
```

At least one of `query` or `file_path` is required.

**Response Format:**

```
Found 3 matching commit(s):

[abc1234] 2026-02-05 -- vault(vault): add meeting notes
[def5678] 2026-02-04 -- organize(vault): move project files
[ghi9012] 2026-02-03 -- vault(vault): update shopping list
```

### view_file_history

Show commit history for a specific file with optional diff details.

**Input Schema:**

```typescript
{
  file_path: string,       // Path to the file (required)
  max_results?: integer,   // Maximum commits to return (default: 5)
  include_diff?: boolean   // Include diff details per commit (default: false)
}
```

**Response Format:**

```
History for "notes/meeting.md" (2 commit(s)):

## [abc1234] 2026-02-05
vault(vault): add meeting notes

## [def5678] 2026-02-04
vault(vault): update meeting notes
```

When `include_diff` is true, diff content is included per commit (truncated at 5000 chars per file).

### view_commit

View full details of a specific commit including message, author, date, and per-file diffs.

**Input Schema:**

```typescript
{
  commit_hash: string  // Full or abbreviated commit hash (required)
}
```

**Response Format:**

```
## Commit abc1234567890...
Author: obsidian <smarthole@local>
Date: 2026-02-05T10:30:00.000Z

vault(vault): add meeting notes

### Files Changed (2)
  ADD notes/meeting.md
  MODIFY notes/index.md
```

## Plugin Lifecycle

- **On load**: If `enableGitVersionControl` is true, `initializeGitService()` runs (init repo + seed `.gitignore`)
- **Settings toggle on**: Calls `initializeGitService()` immediately
- **Settings toggle off**: Calls `teardownGitService()` (sets service to null)
- **On unload**: Calls `teardownGitService()`
- **Tool registration**: Git tools are registered in `processWithRetry()` only when `plugin.getGitService()` returns non-null

## Settings

| Setting | Type | Default | Description |
|---------|------|---------|-------------|
| `enableGitVersionControl` | toggle | `false` | Enable git tracking (initializes repo on first enable) |
| `autoCommitAfterProcessing` | toggle | `true` | Auto-commit after agent processing (only visible when git enabled) |

## Implementation

Located in:
- `src/git/types.ts` - Type definitions (GitCommitMetadata, GitCommitOptions, GitCommitInfo, GitDiffEntry, GitSearchOptions)
- `src/git/GitService.ts` - Core service class
- `src/git/index.ts` - Module re-exports
- `src/llm/tools/git/searchGitHistory.ts` - search_git_history tool factory
- `src/llm/tools/git/viewFileHistory.ts` - view_file_history tool factory
- `src/llm/tools/git/viewCommit.ts` - view_commit tool factory
- `src/llm/tools/git/index.ts` - `createGitTools()` aggregator
- `src/processor/MessageProcessor.ts` - Auto-commit integration (autoCommit, generateCommitMessage methods)
