---
id: T-implement-git-history-tools
title: Implement git history tools for the agent
status: open
priority: medium
parent: F-git-version-control
prerequisites:
  - T-implement-gitservice-core
  - T-add-git-settings-protected
affectedFiles: {}
log: []
schema: v1.0
childrenIds: []
created: 2026-02-06T00:42:05.877Z
updated: 2026-02-06T00:42:05.877Z
---

## Context

This task creates three LLM tools that give the agent read-only access to git history. These tools follow the existing `ToolHandler` factory pattern used by vault tools in `src/llm/tools/`. The tools are conditionally registered in MessageProcessor only when git version control is enabled.

Parent feature: F-git-version-control
Full requirements: `.trellis/requirements/git-version-control.md`
Implementation plan: See F-git-version-control body for full plan.

## Key Files to Create
- `src/llm/tools/git/searchGitHistory.ts`
- `src/llm/tools/git/viewFileHistory.ts`
- `src/llm/tools/git/viewCommit.ts`
- `src/llm/tools/git/index.ts`
- `tests/llm/tools/git/searchGitHistory.test.ts`
- `tests/llm/tools/git/viewFileHistory.test.ts`
- `tests/llm/tools/git/viewCommit.test.ts`

## Key Files to Modify
- `src/processor/MessageProcessor.ts` — Add conditional git tool registration (after line 424, after getConversationTool registration)
- `src/llm/tools/index.ts` — Add re-export for `createGitTools`
- `src/llm/index.ts` — Add re-export for `createGitTools`

## Key Files to Reference (read-only — CRITICAL for following existing patterns)
- `src/llm/tools/searchFiles.ts` — **PRIMARY PATTERN**: tool definition with `const toolDefinition: Tool`, factory function `createSearchFilesTool(app: App): ToolHandler`, input validation, formatted string output. Each git tool should follow this exact pattern.
- `src/llm/tools/readFile.ts` — Simpler tool example for reference
- `src/llm/LLMService.ts` lines 27-32 — `ToolHandler` interface: `{ definition: Tool; execute: (input: Record<string, unknown>) => Promise<string> }`
- `src/llm/types.ts` lines 75-92 — `Tool` and `ToolInputSchema` types
- `src/processor/MessageProcessor.ts` lines 380-424 — How vault and communication tools are registered (pattern to follow for git tools)

## Implementation Requirements

### 1. Create `src/llm/tools/git/searchGitHistory.ts`

**Tool: `search_git_history`**

```typescript
import type { GitService } from "../../../git";
import type { ToolHandler } from "../../LLMService";
import type { Tool } from "../../types";

const toolDefinition: Tool = {
  name: "search_git_history",
  description: "Search commit history by message content, file path, date range, or combination. Returns matching commits with hash, date, message, and files changed summary.",
  inputSchema: {
    type: "object",
    properties: {
      query: {
        type: "string",
        description: "Text to search for in commit messages.",
      },
      file_path: {
        type: "string",
        description: "Filter to commits that affected this file path.",
      },
      max_results: {
        type: "integer",
        description: "Maximum number of commits to return. Default is 10.",
      },
      since: {
        type: "string",
        description: "ISO date string. Only return commits after this date.",
      },
      until: {
        type: "string",
        description: "ISO date string. Only return commits before this date.",
      },
    },
    required: [],
  },
};

export function createSearchGitHistoryTool(gitService: GitService): ToolHandler {
  return {
    definition: toolDefinition,
    execute: async (input: Record<string, unknown>): Promise<string> => {
      // Validate: at least one of query or file_path required
      // Parse since/until from ISO strings to Date
      // Call gitService.searchCommits(query, { filepath, since, until, maxResults })
      // Format: "[abc1234] 2026-02-05 — vault(notes): summary (3 files changed)"
    },
  };
}
```

### 2. Create `src/llm/tools/git/viewFileHistory.ts`

**Tool: `view_file_history`**

Input schema: `file_path` (required), `max_results` (optional, default 5), `include_diff` (optional boolean, default false).

Execute flow:
1. Validate `file_path` is provided
2. Call `gitService.log({ maxCount: max_results, filepath: file_path })`
3. If `include_diff` is true, call `gitService.getFileDiffs(hash)` for each commit
4. Format output with commit hash, date, message, optional diff per entry

### 3. Create `src/llm/tools/git/viewCommit.ts`

**Tool: `view_commit`**

Input schema: `commit_hash` (required).

Execute flow:
1. Validate `commit_hash` is provided
2. Call `gitService.getCommitDetails(commit_hash)`
3. Format output: full message, date, author, per-file diffs

### 4. Create `src/llm/tools/git/index.ts`

```typescript
import type { GitService } from "../../../git";
import type { ToolHandler } from "../../LLMService";
import { createSearchGitHistoryTool } from "./searchGitHistory";
import { createViewFileHistoryTool } from "./viewFileHistory";
import { createViewCommitTool } from "./viewCommit";

export function createGitTools(gitService: GitService): ToolHandler[] {
  return [
    createSearchGitHistoryTool(gitService),
    createViewFileHistoryTool(gitService),
    createViewCommitTool(gitService),
  ];
}

export { createSearchGitHistoryTool } from "./searchGitHistory";
export { createViewFileHistoryTool } from "./viewFileHistory";
export { createViewCommitTool } from "./viewCommit";
```

### 5. Register tools in MessageProcessor (`src/processor/MessageProcessor.ts`)

**Add import** at top:
```typescript
import { createGitTools } from "../llm/tools/git";
```

**Add conditional registration** after the `getConversationTool` block (after line 424, before `// Process the message`):
```typescript
// Conditionally register git history tools when git is enabled
const gitService = this.plugin.getGitService();
if (gitService) {
  const gitTools = createGitTools(gitService);
  for (const tool of gitTools) {
    llmService.registerTool(tool);
    toolNames.push(tool.definition.name);
  }
}
```

This uses `this.plugin.getGitService()` which is already available since `this.plugin` is a property of MessageProcessor (set in constructor from config, see line 72).

### 6. Update module exports

**`src/llm/tools/index.ts`** — Add at end:
```typescript
// Git Tools (conditionally registered when git is enabled)
export { createGitTools } from "./git";
```

**`src/llm/index.ts`** — Add:
```typescript
// Git Tools
export { createGitTools } from "./tools";
```

### 7. Unit Tests

Create tests in `tests/llm/tools/git/` following existing patterns.

Mock `GitService` — create a simple mock object with the methods each tool calls. No need for the full GitService implementation.

**searchGitHistory.test.ts:**
- Validates input: error when neither `query` nor `file_path` provided
- Calls `gitService.searchCommits` with correct parsed params
- Formats output correctly (abbreviated hashes, dates, file counts)
- Handles empty results

**viewFileHistory.test.ts:**
- Validates required `file_path`
- Calls `gitService.log` with filepath filter
- Optionally includes diffs when `include_diff` is true
- Formats output correctly

**viewCommit.test.ts:**
- Validates required `commit_hash`
- Calls `gitService.getCommitDetails` with correct hash
- Formats full output with message, author, diffs

## Output Formatting Guidelines

Keep outputs concise and structured for LLM consumption:
- Use abbreviated hashes (7 chars) in listings
- Show full hash in detail views
- Truncate diff content if extremely large (>5000 chars per file)
- Use Markdown-like formatting (## headers, code blocks for diffs)
- Include "No results found" messages for empty searches

## Acceptance Criteria

- [ ] `search_git_history` tool implemented with input validation and query/file/date filtering
- [ ] `view_file_history` tool implemented with optional diff inclusion
- [ ] `view_commit` tool implemented with full commit details and diffs
- [ ] `createGitTools()` aggregator returns all three tools
- [ ] Tools registered in MessageProcessor only when GitService is available (git enabled)
- [ ] Tools NOT registered when git is disabled (getGitService returns null)
- [ ] Tool output formatted as readable strings for LLM consumption
- [ ] Unit tests for each tool covering validation, delegation, and formatting
- [ ] Module exports updated in `src/llm/tools/index.ts` and `src/llm/index.ts`
- [ ] `mise run quality` passes

## Out of Scope

- GitService implementation (handled by T-implement-gitservice-core)
- Settings and plugin lifecycle (handled by T-add-git-settings-protected)
- Auto-commit after processing (handled by T-implement-auto-commit-after)
- Write operations (no revert, no direct commit tool for the agent)
