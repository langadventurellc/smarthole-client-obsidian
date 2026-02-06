---
id: T-implement-gitservice-core
title: Implement GitService core with isomorphic-git
status: done
priority: high
parent: F-git-version-control
prerequisites: []
affectedFiles:
  package.json: Added isomorphic-git as a production dependency
  package-lock.json: Updated lock file with isomorphic-git and its transitive dependencies
  src/git/types.ts: Created TypeScript type definitions for git integration
    (GitCommitMetadata, GitCommitOptions, GitCommitInfo, GitDiffEntry,
    GitSearchOptions)
  src/git/GitService.ts: Created core GitService class wrapping isomorphic-git
    with initialize, isInitialized, seedGitignore, hasChanges, getChangedFiles,
    commitAll, formatCommitMessage, log, searchCommits, getCommitDetails,
    getFileDiffs
  src/git/index.ts: Created module re-exports for GitService and all types
  tests/git/GitService.test.ts: Created 23 unit tests covering initialization,
    gitignore seeding, change detection, commit operations, message formatting,
    log queries, search filtering, commit details, and file diffs
log:
  - "Research phase complete. Reviewed: RetrospectionService pattern, LLM types
    pattern, test patterns, package.json, esbuild config, tsconfig. Verified
    isomorphic-git API docs (statusMatrix returns [filepath, HEAD, WORKDIR,
    STAGE], walk uses TREE({ref}) with map callback). Starting implementation."
  - Implemented the foundational GitService core with isomorphic-git. Installed
    isomorphic-git as a production dependency, created src/git/types.ts with all
    TypeScript type definitions (GitCommitMetadata, GitCommitOptions,
    GitCommitInfo, GitDiffEntry, GitSearchOptions), created
    src/git/GitService.ts with full repository management (initialize,
    isInitialized, seedGitignore), change detection (hasChanges,
    getChangedFiles), commit operations (commitAll, formatCommitMessage),
    log/query operations (log, searchCommits), and diff operations
    (getCommitDetails, getFileDiffs using walk/TREE). Created src/git/index.ts
    module exports and tests/git/GitService.test.ts with 23 unit tests covering
    all public methods with mocked isomorphic-git. All quality checks pass
    (lint, format, type-check) and all 39 tests pass (23 new + 16 existing).
    Build succeeds cleanly with isomorphic-git bundled.
schema: v1.0
childrenIds: []
created: 2026-02-06T00:41:07.862Z
updated: 2026-02-06T00:41:07.862Z
---

## Context

This is the foundational task for the Git Version Control feature (F-git-version-control). It creates the core `GitService` class that wraps `isomorphic-git` operations. All other tasks in this feature depend on this service.

Full requirements: `.trellis/requirements/git-version-control.md`
Implementation plan: See F-git-version-control body for full plan.

## Key Files to Create
- `src/git/types.ts` — TypeScript type definitions
- `src/git/GitService.ts` — Core service wrapping isomorphic-git
- `src/git/index.ts` — Module re-exports
- `tests/git/GitService.test.ts` — Unit tests with mocked isomorphic-git

## Key Files to Reference (read-only, for patterns)
- `src/retrospection/RetrospectionService.ts` — Pattern for a service class with constructor
- `src/llm/types.ts` — Pattern for a well-organized types file with JSDoc
- `tests/retrospection/RetrospectionService.test.ts` — Test patterns (Vitest, describe/it/expect, minimal mocks, helper factory functions like `makeSettings()`)
- `package.json` — Current dependencies (only `@anthropic-ai/sdk` as a production dep)
- `esbuild.config.mjs` — Build config (isomorphic-git is NOT in external, so it will be bundled)
- `tsconfig.json` — TypeScript config (target ES2018, module CommonJS, strict mode)

## Implementation Requirements

### 1. Install dependency

```bash
npm install isomorphic-git
```

Adds `isomorphic-git@1.30.0` to `package.json`. The package is pure JS and will be bundled by esbuild into `main.js`.

**Important build note**: Node.js `fs` module is used by isomorphic-git. Since esbuild target is CJS and runs in Electron, `require('fs')` resolves at runtime. If bundling issues arise, add `"fs"` to the `external` array in `esbuild.config.mjs`, but try without first.

### 2. Create `src/git/types.ts`

```typescript
/** Commit metadata appended automatically to commit messages (not LLM-generated) */
export interface GitCommitMetadata {
  conversationId: string;
  toolsUsed: string[];
  filesAffected: string[];
  source: "agent" | "mixed";
}

/** Options for creating a commit */
export interface GitCommitOptions {
  type: "vault" | "organize" | "cleanup";
  summary: string;       // LLM-generated summary line
  body: string;          // LLM-generated body
  metadata: GitCommitMetadata;
  authorName: string;    // from settings.clientName
}

/** Info about a single commit (returned from log/search) */
export interface GitCommitInfo {
  hash: string;            // full OID
  abbreviatedHash: string; // first 7 chars
  message: string;         // full commit message
  date: Date;
  author: { name: string; email: string };
  filesChanged?: GitDiffEntry[];
}

/** Diff information for a single file in a commit */
export interface GitDiffEntry {
  filepath: string;
  type: "add" | "modify" | "delete";
  content?: string;   // diff content when requested
}

/** Search options for commit history */
export interface GitSearchOptions {
  query?: string;
  filepath?: string;
  since?: Date;
  until?: Date;
  maxResults?: number;
}
```

### 3. Create `src/git/GitService.ts`

Constructor takes `vaultBasePath: string`. Uses Node.js `fs` module: `import * as fs from "fs"` (compiles to `const fs = require("fs")` in CJS).

**isomorphic-git API Usage Map:**

| Method | isomorphic-git Functions |
|---|---|
| `initialize()` | `git.init({ fs, dir })` — only if `.git/` doesn't exist |
| `isInitialized()` | `fs.existsSync(path.join(dir, '.git'))` |
| `seedGitignore()` | `fs.existsSync()` + `fs.writeFileSync()` — only if `.gitignore` doesn't exist |
| `commitAll(options)` | `git.statusMatrix()` → `git.add()`/`git.remove()` per file → `git.commit()` |
| `hasChanges()` | `git.statusMatrix()` — check any row != [1,1,1] |
| `getChangedFiles()` | `git.statusMatrix()` — return filepaths of changed rows |
| `log(options)` | `git.log({ fs, dir, depth?, filepath? })` |
| `searchCommits(query, options)` | `git.log()` → filter by message text, date range |
| `getCommitDetails(hash)` | `git.readCommit()` + `walk(TREE)` comparing parent/commit trees |
| `getFileDiffs(hash)` | `git.walk({ trees: [TREE({ref: parent}), TREE({ref: commit})] })` |
| `formatCommitMessage(options)` | Pure string formatting — no git calls |

**Key implementation details:**

**Staging strategy for `commitAll`:**
- `git.statusMatrix({ fs, dir })` returns rows of `[filepath, HEAD, WORKDIR, STAGE]`
- Changed files: any row where `!(HEAD===1 && WORKDIR===1 && STAGE===1)`
- If workdir column = 0 (deleted): `git.remove({ fs, dir, filepath })`
- Otherwise: `git.add({ fs, dir, filepath })`
- Then `git.commit({ fs, dir, message: formattedMessage, author: { name: authorName, email: 'smarthole@local' } })`
- Return commit SHA string, or `null` if no changes

**Diff generation via `walk`:**
```typescript
import git, { walk, TREE } from 'isomorphic-git';

async getFileDiffs(commitOid: string): Promise<GitDiffEntry[]> {
  const commit = await git.readCommit({ fs, dir: this.basePath, oid: commitOid });
  const parentOid = commit.commit.parent[0]; // first parent (or null for initial commit)
  
  const diffs: GitDiffEntry[] = [];
  const trees = parentOid
    ? [TREE({ ref: parentOid }), TREE({ ref: commitOid })]
    : [TREE({ ref: commitOid })]; // initial commit: everything is "add"
  
  await walk({
    fs, dir: this.basePath,
    trees,
    map: async (filepath, entries) => {
      if (filepath === '.') return;
      const [parentEntry, commitEntry] = parentOid ? entries : [null, entries[0]];
      const pOid = await parentEntry?.oid();
      const cOid = await commitEntry?.oid();
      if (pOid === cOid) return; // unchanged
      if (!parentEntry && commitEntry) diffs.push({ filepath, type: 'add' });
      else if (parentEntry && !commitEntry) diffs.push({ filepath, type: 'delete' });
      else diffs.push({ filepath, type: 'modify' });
    }
  });
  return diffs;
}
```

**Commit message format** (`formatCommitMessage`):
```
type(scope): summary

body

---
smarthole-metadata:
  conversation: <conversationId>
  tools-used: [tool1, tool2]
  files-affected: [file1, file2]
  source: agent|mixed
```

**`.gitignore` defaults:**
```
.obsidian/
.smarthole/
.trash/
.DS_Store
Thumbs.db
desktop.ini
```

### 4. Create `src/git/index.ts`

```typescript
export { GitService } from "./GitService";
export type {
  GitCommitInfo,
  GitDiffEntry,
  GitCommitMetadata,
  GitCommitOptions,
  GitSearchOptions,
} from "./types";
```

### 5. Unit Tests (`tests/git/GitService.test.ts`)

Mock `isomorphic-git` and `fs` using `vi.mock()`. Follow the test patterns from `tests/retrospection/RetrospectionService.test.ts`.

**Test sections:**
- **Initialization**: `initialize()` calls `git.init()` when `.git/` doesn't exist; skips when it does
- **Gitignore seeding**: Creates `.gitignore` with correct defaults when none exists; skips when present
- **hasChanges**: Returns true when statusMatrix has non-[1,1,1] rows; false when all are [1,1,1]
- **getChangedFiles**: Returns correct filepaths from statusMatrix
- **commitAll**: Stages changed files, removes deleted files, calls git.commit; returns null when no changes
- **formatCommitMessage**: Produces correct structured format with metadata block
- **log**: Delegates to git.log with correct options
- **searchCommits**: Filters log results by query text, date range
- **getCommitDetails**: Returns commit info with diff entries
- **getFileDiffs**: Uses walk to compare parent and commit trees

## Acceptance Criteria

- [ ] `isomorphic-git` added as production dependency in package.json
- [ ] `src/git/types.ts` defines all necessary types
- [ ] `src/git/GitService.ts` implements all repository management, commit, and query operations
- [ ] `src/git/index.ts` exports the module
- [ ] `.gitignore` seeding creates correct default content
- [ ] `.gitignore` seeding is idempotent (doesn't modify existing file)
- [ ] Commit messages follow the structured format with metadata block
- [ ] `hasChanges()` correctly detects uncommitted changes
- [ ] Search/log operations support filtering by query, file, date range
- [ ] Unit tests cover core operations with mocked isomorphic-git
- [ ] `mise run quality` passes

## Out of Scope

- Settings UI (handled by T-add-git-settings-protected)
- Plugin lifecycle integration (handled by T-add-git-settings-protected)
- LLM tool definitions (handled by T-implement-git-history-tools)
- Auto-commit integration with MessageProcessor (handled by T-implement-auto-commit-after)
- Protected paths (handled by T-add-git-settings-protected)
- Remote push/pull, branching, revert operations
