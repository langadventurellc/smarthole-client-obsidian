---
id: F-git-version-control
title: Git Version Control Integration
status: in-progress
priority: medium
parent: none
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
  src/settings.ts: Added enableGitVersionControl and autoCommitAfterProcessing to
    SmartHoleSettings interface and DEFAULT_SETTINGS. Added Version Control
    section in display() with Enable Git toggle (calls
    initializeGitService/teardownGitService) and conditional Auto-commit toggle.
  src/main.ts: Added GitService import, gitService property,
    initializeGitService() async method, teardownGitService() method,
    getGitService() getter. Added git initialization in onload() when enabled,
    teardown in onunload(), and two new field extractions in extractSettings().
  src/llm/tools/protected.ts: Added .git to PROTECTED_FOLDERS array and updated
    JSDoc to document the new protected folder.
log:
  - >-
    Implementation plan created. Analyzed the full codebase to identify:

    - Existing patterns (ToolHandler factory pattern, settings toggle lifecycle,
    RetrospectionService lightweight LLM call pattern, fire-and-forget async
    pattern)

    - All integration points (MessageProcessor tool registration at line 424,
    settings UI, protected paths, plugin lifecycle in main.ts)

    - isomorphic-git API (v1.30.0): init, add, commit, remove, log,
    statusMatrix, readCommit, walk/TREE for diffs

    - Build considerations (esbuild bundles isomorphic-git, Node.js fs available
    in Electron)

    - Key line numbers and exact code patterns for each modification point


    Updated feature body with comprehensive plan and updated all 4 child task
    bodies with:

    - Key files to create and modify (with line numbers)

    - Key files to reference for patterns

    - Concrete code examples and implementation approaches

    - Risk mitigations

    - Acceptance criteria
schema: v1.0
childrenIds:
  - T-add-git-settings-protected
  - T-implement-auto-commit-after
  - T-implement-git-history-tools
  - T-implement-gitservice-core
created: 2026-02-06T00:28:35.580Z
updated: 2026-02-06T00:28:35.580Z
---

## Purpose

Integrate git version control into the SmartHole plugin to track all vault changes (agent and user-initiated), provide semantically meaningful commit history, and give the agent tools to search that history. Uses `isomorphic-git` for a pure-JS implementation with no dependency on the user having git installed.

## Requirements Document

Full requirements: `.trellis/requirements/git-version-control.md`

## Implementation Plan

### Execution Order (Dependency Graph)

```
T-implement-gitservice-core  (no prerequisites)
       ↓
T-add-git-settings-protected  (depends on T-implement-gitservice-core)
       ↓
  ┌────┴────┐
  ↓         ↓
T-implement-git-history-tools   T-implement-auto-commit-after
(depends on both above)          (depends on both above)
```

Tasks 3 and 4 are independent of each other and can be parallelized once tasks 1 and 2 are complete.

---

### Task 1: T-implement-gitservice-core — GitService Core with isomorphic-git

**Priority**: High (foundation — everything else depends on this)
**Prerequisites**: None

#### Key Files to Create
- `src/git/types.ts` — TypeScript type definitions
- `src/git/GitService.ts` — Core service wrapping isomorphic-git
- `src/git/index.ts` — Module re-exports
- `tests/git/GitService.test.ts` — Unit tests with mocked isomorphic-git

#### Key Files to Reference (read-only, for patterns)
- `src/retrospection/RetrospectionService.ts` — Pattern for a service class with constructor accepting App/settings
- `src/llm/types.ts` — Pattern for a well-organized types file
- `tests/retrospection/RetrospectionService.test.ts` — Test patterns (Vitest, describe/it/expect, minimal mocks)

#### Implementation Approach

**Step 1: Install dependency**
```bash
npm install isomorphic-git
```
This will add `isomorphic-git@1.30.0` to `package.json` dependencies. The package is pure JS and will be bundled by esbuild (it is NOT in the `external` list in `esbuild.config.mjs`, so it will be bundled into `main.js`). Important: isomorphic-git is a large package; verify the bundle size is acceptable after install.

**Step 2: Create `src/git/types.ts`**

Define these types:
```typescript
// Commit metadata appended to commit messages (not generated by LLM)
export interface GitCommitMetadata {
  conversationId: string;
  toolsUsed: string[];
  filesAffected: string[];
  source: "agent" | "mixed";
}

// Options for creating a commit
export interface GitCommitOptions {
  type: "vault" | "organize" | "cleanup";
  summary: string;       // LLM-generated first line after "type(scope): "
  body: string;          // LLM-generated body
  metadata: GitCommitMetadata;
  authorName: string;    // from settings.clientName
}

// Info about a single commit (returned from log/search)
export interface GitCommitInfo {
  hash: string;          // full OID
  abbreviatedHash: string; // first 7 chars
  message: string;       // full commit message
  date: Date;
  author: { name: string; email: string };
  filesChanged?: GitDiffEntry[];
}

// Diff information for a single file in a commit
export interface GitDiffEntry {
  filepath: string;
  type: "add" | "modify" | "delete";
  content?: string;      // diff content (old vs new) when requested
}

// Search options for commit history
export interface GitSearchOptions {
  query?: string;        // text to search in messages
  filepath?: string;     // filter by file path
  since?: Date;
  until?: Date;
  maxResults?: number;
}
```

**Step 3: Create `src/git/GitService.ts`**

Key design decisions:
- Constructor takes `vaultBasePath: string` (the filesystem path to the vault root, obtained via `(app.vault.adapter as any).basePath` in the plugin)
- Uses Node.js `fs` module directly (available in Obsidian's Electron runtime): `import * as fs from "fs"` — this works because esbuild doesn't externalize `fs` but Electron provides it at runtime. Actually, since `"electron"` and `"obsidian"` are external but `fs` is a Node.js built-in available in Electron, we can `import fs from "fs"` and it will resolve at runtime. However, we need to use `require('fs')` or handle it carefully since the target is `es2018`/`CommonJS`. The safest approach: `import * as fs from "fs"` which compiles to `const fs = require("fs")` in CommonJS.
- All isomorphic-git calls pass `{ fs, dir: this.vaultBasePath }` as the first two options
- All methods are async (isomorphic-git returns Promises)

**isomorphic-git API Usage Map:**

| GitService Method | isomorphic-git Functions Used |
|---|---|
| `initialize()` | `git.init({ fs, dir })` |
| `isInitialized()` | Check if `.git/` exists via `fs.existsSync(path.join(dir, '.git'))` |
| `seedGitignore()` | `fs.existsSync()` + `fs.writeFileSync()` (Node.js fs, not vault API) |
| `commitAll(options)` | `git.statusMatrix()` → `git.add()` for each changed file → `git.commit()` |
| `hasChanges()` | `git.statusMatrix()` — check if any file has status != [1,1,1] |
| `log(options)` | `git.log({ fs, dir, depth?, filepath? })` |
| `searchCommits(query, options)` | `git.log()` then filter by message text, date range |
| `getCommitDetails(hash)` | `git.readCommit()` + diff via `walk(TREE)` comparing parent tree to commit tree |
| `getFileDiffs(hash)` | `git.walk({ trees: [TREE({ref: parentOid}), TREE({ref: commitOid})] })` with `map` function comparing OIDs |

**Staging strategy for `commitAll`:**
- Use `git.statusMatrix({ fs, dir })` to get the full status matrix
- For each file with changes (status row where HEAD/workdir/stage columns differ from [1,1,1]):
  - If file is deleted (workdir column = 0): use `git.remove({ fs, dir, filepath })`
  - Otherwise: use `git.add({ fs, dir, filepath })`
- Then `git.commit({ fs, dir, message, author: { name, email: 'smarthole@local' } })`
- Return the commit SHA, or `null` if no changes

**Diff generation approach using `walk`:**
```typescript
import { walk, TREE } from 'isomorphic-git';

// Compare parent tree to commit tree
const diffs: GitDiffEntry[] = [];
await walk({
  fs, dir: this.vaultBasePath,
  trees: [TREE({ ref: parentOid }), TREE({ ref: commitOid })],
  map: async (filepath, [parentEntry, commitEntry]) => {
    // Skip directories
    if (filepath === '.') return;
    const parentOid = await parentEntry?.oid();
    const commitOid = await commitEntry?.oid();
    if (parentOid === commitOid) return; // unchanged
    if (!parentEntry && commitEntry) diffs.push({ filepath, type: 'add' });
    else if (parentEntry && !commitEntry) diffs.push({ filepath, type: 'delete' });
    else diffs.push({ filepath, type: 'modify' });
  }
});
```

**Commit message formatting** (`formatCommitMessage`):
```
type(scope): summary

body

---
smarthole-metadata:
  conversation: <id>
  tools-used: [list]
  files-affected: [list]
  source: agent|mixed
```

**Step 4: Create `src/git/index.ts`**
```typescript
export { GitService } from "./GitService";
export type { GitCommitInfo, GitDiffEntry, GitCommitMetadata, GitCommitOptions, GitSearchOptions } from "./types";
```

**Step 5: Unit tests** — Mock `isomorphic-git` and `fs` using `vi.mock()`. Test patterns from `tests/retrospection/RetrospectionService.test.ts`:
- Use `describe`/`it`/`expect` blocks
- Create minimal mock objects with only the fields used
- Test all public methods: `initialize`, `isInitialized`, `seedGitignore`, `commitAll`, `hasChanges`, `log`, `searchCommits`, `getCommitDetails`, `formatCommitMessage`

#### Risks & Mitigations
- **Bundle size**: isomorphic-git is ~300KB minified. Since `@anthropic-ai/sdk` is already bundled, this should be acceptable. Monitor after install.
- **fs access in Electron**: Node.js `fs` is available in Obsidian's desktop Electron environment. The plugin is `isDesktopOnly: true`, so this is safe.
- **isomorphic-git `walk` API complexity**: The `walk` function uses an async iterator pattern with `map` callbacks. Need careful handling of `WalkerEntry` nullable values (entries can be null if the file doesn't exist in one tree).

---

### Task 2: T-add-git-settings-protected — Settings, Protected Paths, and Plugin Lifecycle

**Priority**: High (blocks tasks 3 and 4)
**Prerequisites**: T-implement-gitservice-core

#### Key Files to Modify
- `src/settings.ts` — Add settings interface fields, defaults, and UI section (lines 7-26 for interface, lines 55-68 for defaults, lines 117-436 for display)
- `src/llm/tools/protected.ts` — Add `.git` to PROTECTED_FOLDERS (line 16)
- `src/main.ts` — Add GitService lifecycle, update extractSettings (lines 18-27 for properties, 28-121 for onload, 122-137 for onunload, 160-192 for extractSettings)

#### Key Files to Reference (read-only, for patterns)
- `src/main.ts` lines 209-221 — `setSmartHoleConnectionEnabled()` pattern for toggle-controlled lifecycle
- `src/settings.ts` lines 121-133 — `enableSmartHoleConnection` toggle pattern
- `src/settings.ts` lines 340-353 — `enableConversationRetrospection` toggle pattern

#### Implementation Approach

**Step 1: Modify `src/settings.ts`**

Add to `SmartHoleSettings` interface (after `retrospectionPrompt`):
```typescript
/** Whether to enable git version control for vault changes */
enableGitVersionControl: boolean;
/** Whether to auto-commit after agent message processing */
autoCommitAfterProcessing: boolean;
```

Add to `DEFAULT_SETTINGS`:
```typescript
enableGitVersionControl: false,
autoCommitAfterProcessing: true,
```

Add UI in `display()` method — add a new "Version Control" section AFTER the "Clear Conversation History" section (end of current display method, around line 435). Pattern: use `containerEl.createEl("h3", { text: "Version Control" })` for the section header (note: the existing settings don't use section headers, so this would be the first — but the task spec says to use h3. Actually, looking at the existing code, there are no h3 headers. The settings are a flat list. Follow the same flat pattern but add the h3 as specified in the task.)

```typescript
// Version Control section
containerEl.createEl("h3", { text: "Version Control" });

new Setting(containerEl)
  .setName("Enable Git Version Control")
  .setDesc("Track vault changes with git. Initializes a git repository on first enable.")
  .addToggle((toggle) =>
    toggle.setValue(this.plugin.settings.enableGitVersionControl).onChange(async (value) => {
      this.plugin.settings.enableGitVersionControl = value;
      await this.plugin.saveSettings();
      if (value) {
        await this.plugin.initializeGitService();
      } else {
        this.plugin.teardownGitService();
      }
      this.display(); // Re-render to show/hide auto-commit toggle
    })
  );

// Only show auto-commit when git is enabled
if (this.plugin.settings.enableGitVersionControl) {
  new Setting(containerEl)
    .setName("Auto-commit after processing")
    .setDesc("Automatically commit vault changes after the agent finishes processing a message")
    .addToggle((toggle) =>
      toggle.setValue(this.plugin.settings.autoCommitAfterProcessing).onChange(async (value) => {
        this.plugin.settings.autoCommitAfterProcessing = value;
        await this.plugin.saveSettings();
      })
    );
}
```

Key pattern note: Call `this.display()` on the git enable toggle to re-render and conditionally show/hide the auto-commit toggle. This is a common Obsidian settings pattern for conditional visibility.

**Step 2: Modify `src/llm/tools/protected.ts`**

Change line 16 from:
```typescript
const PROTECTED_FOLDERS = [".obsidian", ".smarthole"] as const;
```
to:
```typescript
const PROTECTED_FOLDERS = [".obsidian", ".smarthole", ".git"] as const;
```

**Step 3: Modify `src/main.ts`**

Add import at top:
```typescript
import { GitService } from "./git";
```

Add property to class (after `conversationManager` declaration, around line 26):
```typescript
private gitService: GitService | null = null;
```

Add methods (after `setSmartHoleConnectionEnabled`, around line 221):
```typescript
async initializeGitService(): Promise<void> {
  try {
    const basePath = (this.app.vault.adapter as any).basePath as string;
    this.gitService = new GitService(basePath);
    await this.gitService.initialize();
    await this.gitService.seedGitignore();
    console.log("SmartHole: Git service initialized");
  } catch (error) {
    console.error("SmartHole: Failed to initialize git service:", error);
    this.gitService = null;
  }
}

teardownGitService(): void {
  this.gitService = null;
  console.log("SmartHole: Git service torn down");
}

getGitService(): GitService | null {
  return this.gitService;
}
```

In `onload()`, after ConversationManager initialization (around line 74), add:
```typescript
// Initialize GitService if enabled
if (this.settings.enableGitVersionControl) {
  await this.initializeGitService();
}
```

In `onunload()`, add before clearing processor references:
```typescript
// Clean up git service
this.teardownGitService();
```

Update `extractSettings()` — add after the `retrospectionPrompt` extraction (around line 189):
```typescript
if (typeof d.enableGitVersionControl === "boolean")
  settings.enableGitVersionControl = d.enableGitVersionControl;
if (typeof d.autoCommitAfterProcessing === "boolean")
  settings.autoCommitAfterProcessing = d.autoCommitAfterProcessing;
```

#### Vault Base Path Note
`(this.app.vault.adapter as any).basePath` casts to `any` because the Obsidian typings don't expose `basePath` on `DataAdapter`, but `FileSystemAdapter` (the desktop adapter) does have it. Since this plugin is desktop-only (`isDesktopOnly: true` in manifest), this is safe. The `as any` is the standard Obsidian community pattern for accessing it.

#### Risks & Mitigations
- **Settings migration**: Existing users won't have the new fields in their stored data. The `extractSettings` + `Object.assign({}, DEFAULT_SETTINGS, ...)` pattern handles this gracefully — missing fields get defaults.
- **Conditional re-render**: Calling `this.display()` inside an onChange callback causes a full re-render of the settings panel. This is the standard Obsidian pattern and works correctly.

---

### Task 3: T-implement-git-history-tools — Git History Tools for the Agent

**Priority**: Medium (can be parallelized with Task 4)
**Prerequisites**: T-implement-gitservice-core, T-add-git-settings-protected

#### Key Files to Create
- `src/llm/tools/git/searchGitHistory.ts`
- `src/llm/tools/git/viewFileHistory.ts`
- `src/llm/tools/git/viewCommit.ts`
- `src/llm/tools/git/index.ts`
- `tests/llm/tools/git/searchGitHistory.test.ts`
- `tests/llm/tools/git/viewFileHistory.test.ts`
- `tests/llm/tools/git/viewCommit.test.ts`

#### Key Files to Modify
- `src/processor/MessageProcessor.ts` — Add conditional git tool registration (around line 424)
- `src/llm/tools/index.ts` — Add re-exports for git tools
- `src/llm/index.ts` — Add re-exports for git tools

#### Key Files to Reference (read-only, for patterns)
- `src/llm/tools/searchFiles.ts` — **Primary pattern reference**: tool definition with `toolDefinition: Tool`, factory function `createXxxTool(dependency): ToolHandler`, input validation, formatted string output
- `src/llm/tools/readFile.ts` — Another pattern reference for simpler tools
- `src/llm/LLMService.ts` lines 27-32 — `ToolHandler` interface definition
- `src/llm/types.ts` lines 75-92 — `Tool` and `ToolInputSchema` type definitions

#### Implementation Approach

Each tool follows the exact same pattern as `createSearchFilesTool` in `src/llm/tools/searchFiles.ts`:

1. Define a `const toolDefinition: Tool` with name, description, inputSchema
2. Export a factory function `createXxxTool(gitService: GitService): ToolHandler`
3. Return `{ definition: toolDefinition, execute: async (input) => string }`
4. Validate inputs at the top of `execute`
5. Call GitService methods
6. Format results as human-readable strings

**searchGitHistory.ts** — Key behavior:
- Validate that at least one of `query` or `file_path` is provided
- Parse `since`/`until` from ISO strings to `Date`
- Call `gitService.searchCommits(query, { filepath, since, until, maxResults })`
- Format output: list each commit as `[hash] date — message summary (N files changed)`

**viewFileHistory.ts** — Key behavior:
- Validate `file_path` is provided
- Call `gitService.log({ maxCount: maxResults, filepath: file_path })`
- If `include_diff` is true, call `gitService.getFileDiffs(hash)` for each commit
- Format output: commit entries with hash, date, message, optional diff

**viewCommit.ts** — Key behavior:
- Validate `commit_hash` is provided
- Call `gitService.getCommitDetails(commit_hash)`
- Format output: full message, date, author, per-file diffs

**index.ts aggregator:**
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
```

**MessageProcessor integration** — In `processWithRetry()`, after the `getConversationTool` registration block (around line 424), add:
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

This accesses `getGitService()` via `this.plugin` which is already available (the `plugin` property was added in the MessageProcessor constructor).

**Imports needed in MessageProcessor:**
```typescript
import { createGitTools } from "../llm/tools/git";
```

#### Risks & Mitigations
- **Output formatting for LLM consumption**: Keep outputs concise. Truncate diff content if very large. Include abbreviated hashes (7 chars) for readability.
- **Performance of `log` with `filepath`**: isomorphic-git's `log({ filepath })` walks the commit tree for each commit, which can be slow on large repos. Mitigate by always applying a `depth` limit (default 100) and respecting `maxResults`.

---

### Task 4: T-implement-auto-commit-after — Auto-commit After Message Processing

**Priority**: Medium (can be parallelized with Task 3)
**Prerequisites**: T-implement-gitservice-core, T-add-git-settings-protected

#### Key Files to Modify
- `src/processor/MessageProcessor.ts` — Add auto-commit logic after message processing (around line 487, after retrospection handling)

#### Key Files to Create
- `tests/processor/autoCommit.test.ts` (or `tests/git/autoCommit.test.ts`)

#### Key Files to Reference (read-only, for patterns)
- `src/retrospection/RetrospectionService.ts` — Pattern for lightweight LLM call: create a fresh `new LLMService(app, settings)`, call `initialize()`, call `processMessage()` with a focused prompt, no tools registered
- `src/llm/AnthropicProvider.ts` — Constructor takes `ClaudeModelId`, used as `new AnthropicProvider("claude-haiku-4-5-20251001")`
- `src/types.ts` — Haiku model ID: `"claude-haiku-4-5-20251001"`
- `src/processor/MessageProcessor.ts` lines 474-487 — Retrospection trigger pattern (fire-and-forget with `.catch()`)

#### Implementation Approach

**Step 1: Add `autoCommit` private method to MessageProcessor**

```typescript
private async autoCommit(
  messageText: string,
  toolsUsed: string[],
  conversationId: string
): Promise<void> {
  const gitService = this.plugin.getGitService();
  if (!gitService) return;
  if (!this.settings.autoCommitAfterProcessing) return;
  
  // Check for changes
  const hasChanges = await gitService.hasChanges();
  if (!hasChanges) return;
  
  // Get list of changed files from git status
  const changedFiles = await gitService.getChangedFiles(); // helper method on GitService
  
  // Generate commit message via lightweight Haiku LLM call
  const commitMessage = await this.generateCommitMessage(messageText, toolsUsed, changedFiles);
  
  // Build metadata
  const metadata: GitCommitMetadata = {
    conversationId,
    toolsUsed,
    filesAffected: changedFiles,
    source: "agent", // MVP: default to "agent", refine later
  };
  
  // Determine commit type from LLM output or default
  const commitType = this.inferCommitType(toolsUsed);
  
  // Commit
  await gitService.commitAll({
    type: commitType,
    summary: commitMessage.summary,
    body: commitMessage.body,
    metadata,
    authorName: this.settings.clientName,
  });
}
```

**Step 2: Generate commit message with Haiku**

Key design decision: Do NOT reuse the message processing LLMService instance. Create a new, minimal one with Haiku specifically for commit message generation. This avoids adding unnecessary conversation history tokens.

```typescript
private async generateCommitMessage(
  originalRequest: string,
  toolsUsed: string[],
  changedFiles: string[]
): Promise<{ summary: string; body: string }> {
  // Create a temporary settings override to force Haiku model
  const commitSettings: SmartHoleSettings = {
    ...this.settings,
    model: "claude-haiku-4-5-20251001" as ClaudeModelId,
  };
  
  const llmService = new LLMService(this.app, commitSettings);
  await llmService.initialize();
  
  const prompt = `Generate a concise git commit message for the following changes.
Return ONLY the type, summary, and body. Do not include metadata — that will be added automatically.

Format:
type(scope): summary

body description

Where type is one of: vault (file changes), organize (moves/renames/folders), cleanup (deletions).

Files changed: ${changedFiles.join(", ")}
User's request: ${originalRequest}
Tools used by agent: ${toolsUsed.join(", ")}`;

  const response = await llmService.processMessage(prompt);
  const text = extractTextContent(response).trim();
  
  // Parse the LLM response: first line is "type(scope): summary", rest is body
  const lines = text.split("\n");
  const summary = lines[0] || "vault: update files";
  const body = lines.slice(1).join("\n").trim();
  
  return { summary, body };
}
```

**Step 3: Hook into MessageProcessor.processWithRetry()**

After the assistant message is recorded in conversation history and after the retrospection check (around line 487), add:

```typescript
// Auto-commit after successful processing (fire-and-forget, non-critical)
const activeConversationForCommit = this.conversationManager.getActiveConversation();
if (activeConversationForCommit) {
  void this.autoCommit(
    messageText,
    toolsUsed,
    activeConversationForCommit.id
  ).catch((err) =>
    console.error("MessageProcessor: Auto-commit failed:", err)
  );
}
```

Critical: Use `void ... .catch()` pattern (fire-and-forget) so auto-commit failures never fail message processing. This matches the pattern used for retrospection at line 456 and 483.

**Step 4: Add `getChangedFiles()` helper to GitService**

This was not in the original T-implement-gitservice-core task but is needed here. It can be added as part of this task since it's a thin wrapper around `statusMatrix`:

```typescript
async getChangedFiles(): Promise<string[]> {
  const matrix = await git.statusMatrix({ fs, dir: this.vaultBasePath });
  return matrix
    .filter(([, head, workdir, stage]) => !(head === 1 && workdir === 1 && stage === 1))
    .map(([filepath]) => filepath);
}
```

Alternatively, add this to GitService during Task 1 proactively.

#### Risks & Mitigations
- **Double LLM call cost**: Each message processing now triggers two LLM calls (main processing + Haiku commit message). Haiku is extremely cheap (~$0.001-0.002 per call), so this is negligible.
- **Race conditions**: Auto-commit is fire-and-forget. If two messages process concurrently, they could race on the git commit. Mitigate by wrapping `commitAll` with a simple lock/mutex in GitService.
- **Commit when nothing changed**: `hasChanges()` check prevents empty commits.
- **Error isolation**: The `void ... .catch()` pattern ensures auto-commit failures are logged but never propagate.

---

## Cross-cutting Concerns

### Build Configuration
- `isomorphic-git` is NOT in the `external` array in `esbuild.config.mjs`, so it WILL be bundled. This is correct — the package needs to be available at runtime.
- Node.js `fs` module: In the esbuild config, `fs` is not externalized explicitly, but since the format is `cjs` and the target is Electron, `require('fs')` will resolve to Node's built-in `fs` at runtime. If bundling issues arise, add `"fs"` to the `external` array.

### Module Exports
- `src/git/index.ts` exports `GitService` and types
- `src/llm/tools/git/index.ts` exports `createGitTools` and individual tool factories
- `src/llm/tools/index.ts` re-exports `createGitTools` from `./git`
- `src/llm/index.ts` re-exports `createGitTools` from `./tools`

### Testing Strategy
- All tests mock `isomorphic-git` and `fs` — no actual git repos
- Follow Vitest patterns from existing tests
- Use `vi.mock('isomorphic-git')` and `vi.mock('fs')` at the top of test files
- Create helper factories for common test objects (like `makeSettings()` pattern in RetrospectionService.test.ts)
- Run `mise run quality` after each task to ensure lint + format + type-check pass

### Integration Flow
```
User sends message → MessageProcessor.process()
  → processWithRetry()
    → Create LLMService, register vault tools, communication tools
    → IF gitService available: register git tools (search_git_history, view_file_history, view_commit)
    → LLM processes message (may use git tools to answer history questions)
    → Record conversation messages
    → IF git enabled AND auto-commit enabled:
      → Check for changes
      → Generate commit message via Haiku
      → commitAll() with structured message + metadata
```

## Acceptance Criteria

- [ ] `isomorphic-git` added as a dependency
- [ ] Git version control toggle in settings (off by default)
- [ ] Auto-commit toggle in settings (on by default, only visible when git enabled)
- [ ] Repo initialization on first enable with `.gitignore` seeding
- [ ] Automatic commits after message processing with structured, LLM-generated messages
- [ ] `search_git_history` tool available to agent when enabled
- [ ] `view_file_history` tool available to agent when enabled
- [ ] `view_commit` tool available to agent when enabled
- [ ] `.git/` added to protected paths
- [ ] Git tools not registered when feature is disabled
- [ ] All existing tests pass
- [ ] Unit tests for GitService core operations (init, commit, log, diff)
- [ ] Unit tests for git tools (input validation, output formatting)
