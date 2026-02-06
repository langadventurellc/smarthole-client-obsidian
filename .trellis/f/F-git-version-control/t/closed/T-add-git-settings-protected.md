---
id: T-add-git-settings-protected
title: Add git settings, protected paths, and plugin lifecycle
status: done
priority: high
parent: F-git-version-control
prerequisites:
  - T-implement-gitservice-core
affectedFiles:
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
  - "Added git version control settings, protected paths, and plugin lifecycle
    integration. Added enableGitVersionControl (default: false) and
    autoCommitAfterProcessing (default: true) to the settings interface and
    defaults. Added a Version Control section in the settings UI with an Enable
    Git toggle that initializes/tears down GitService, and a conditional
    Auto-commit toggle visible only when git is enabled. Added .git to
    PROTECTED_FOLDERS so the agent cannot access git internals. Added GitService
    lifecycle management in SmartHolePlugin: initializeGitService(),
    teardownGitService(), getGitService() methods; initialization in onload()
    when setting is enabled; teardown in onunload(). Updated extractSettings()
    for the two new fields. All quality checks pass (lint, format, type-check)
    and all 39 tests pass."
schema: v1.0
childrenIds: []
created: 2026-02-06T00:41:36.718Z
updated: 2026-02-06T00:41:36.718Z
---

## Context

This task wires the GitService (from T-implement-gitservice-core) into the plugin's settings, protected paths, and lifecycle. After this task, the git feature can be toggled on/off from settings, the `.git/` folder is protected from agent access, and the GitService initializes/tears down with the plugin.

Parent feature: F-git-version-control
Full requirements: `.trellis/requirements/git-version-control.md`
Implementation plan: See F-git-version-control body for full plan.

## Key Files to Modify
- `src/settings.ts` — Add settings interface fields (lines 7-26), defaults (lines 55-68), and UI section (after line 435 in `display()`)
- `src/llm/tools/protected.ts` — Add `.git` to PROTECTED_FOLDERS (line 16)
- `src/main.ts` — Add GitService lifecycle (property near line 26, methods after line 221, onload around line 74, onunload around line 130, extractSettings around line 189)

## Key Files to Reference (read-only, for patterns)
- `src/main.ts` lines 209-221 — `setSmartHoleConnectionEnabled()` pattern for toggle-controlled lifecycle
- `src/settings.ts` lines 121-133 — `enableSmartHoleConnection` toggle pattern
- `src/settings.ts` lines 340-353 — `enableConversationRetrospection` toggle pattern (simple toggle, no lifecycle callback)

## Implementation Requirements

### 1. Settings Interface (`src/settings.ts`)

**Add to `SmartHoleSettings` interface** (after `retrospectionPrompt: string;` at line 25):
```typescript
/** Whether to enable git version control for vault changes */
enableGitVersionControl: boolean;
/** Whether to auto-commit after agent message processing */
autoCommitAfterProcessing: boolean;
```

**Add to `DEFAULT_SETTINGS`** (after `retrospectionPrompt` default at line 67):
```typescript
enableGitVersionControl: false,
autoCommitAfterProcessing: true,
```

**Add UI in `SmartHoleSettingTab.display()`** — Add AFTER the "Clear Conversation History" section (after line 435, at the end of `display()`):

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

Note: `this.display()` re-renders the entire settings panel. This is the standard Obsidian pattern for conditional visibility.

### 2. Protected Paths (`src/llm/tools/protected.ts`)

Change line 16 from:
```typescript
const PROTECTED_FOLDERS = [".obsidian", ".smarthole"] as const;
```
to:
```typescript
const PROTECTED_FOLDERS = [".obsidian", ".smarthole", ".git"] as const;
```

Update the JSDoc comment above to mention `.git/`:
```typescript
/**
 * Folders that are protected from agent file operations.
 * - .obsidian/: Obsidian configuration (could break the app)
 * - .smarthole/: Internal storage (inbox, trash, etc.)
 * - .git/: Git repository data (managed by GitService)
 */
```

### 3. Plugin Lifecycle (`src/main.ts`)

**Add import** at top of file:
```typescript
import { GitService } from "./git";
```

**Add property** to `SmartHolePlugin` class (after `conversationManager` at line 26):
```typescript
private gitService: GitService | null = null;
```

**Add methods** (after `setSmartHoleConnectionEnabled` around line 221):
```typescript
/**
 * Initialize the GitService for vault version control.
 * Called when git is enabled in settings or on plugin load if already enabled.
 */
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

/**
 * Tear down the GitService. The repo remains on disk;
 * the plugin just stops interacting with it.
 */
teardownGitService(): void {
  this.gitService = null;
  console.log("SmartHole: Git service torn down");
}

/**
 * Get the active GitService instance, or null if git is disabled.
 * Used by MessageProcessor for conditional git tool registration and auto-commit.
 */
getGitService(): GitService | null {
  return this.gitService;
}
```

**In `onload()`** — after ConversationManager initialization (after line 74, before MessageProcessor creation):
```typescript
// Initialize GitService if enabled
if (this.settings.enableGitVersionControl) {
  await this.initializeGitService();
}
```

**In `onunload()`** — before clearing processor references (before line 132):
```typescript
// Clean up git service
this.teardownGitService();
```

**Update `extractSettings()`** — add after `retrospectionPrompt` extraction (after line 189):
```typescript
if (typeof d.enableGitVersionControl === "boolean")
  settings.enableGitVersionControl = d.enableGitVersionControl;
if (typeof d.autoCommitAfterProcessing === "boolean")
  settings.autoCommitAfterProcessing = d.autoCommitAfterProcessing;
```

### Vault Base Path Note
`(this.app.vault.adapter as any).basePath` uses `as any` because the Obsidian typings don't expose `basePath` on `DataAdapter`, but `FileSystemAdapter` (the desktop adapter) has it. Since `isDesktopOnly: true`, this is safe. This is the standard community pattern.

## Acceptance Criteria

- [ ] `enableGitVersionControl` and `autoCommitAfterProcessing` added to settings interface and defaults
- [ ] `extractSettings()` in `main.ts` updated to include new fields
- [ ] Version Control section appears in settings UI with both toggles
- [ ] Auto-commit toggle is only visible when git is enabled
- [ ] `.git` added to `PROTECTED_FOLDERS` — agent cannot access `.git/` contents
- [ ] GitService initializes on plugin load when setting is enabled
- [ ] GitService initializes when toggle is turned on from settings
- [ ] GitService tears down (nulled) when toggle is turned off
- [ ] `getGitService()` returns the active instance or null
- [ ] Plugin unload cleans up GitService
- [ ] `mise run quality` passes

## Out of Scope

- Git tool registration in MessageProcessor (handled by T-implement-git-history-tools)
- Auto-commit logic in MessageProcessor (handled by T-implement-auto-commit-after)
- GitService core implementation (handled by T-implement-gitservice-core)
- Commit message generation via LLM (handled by T-implement-auto-commit-after)
