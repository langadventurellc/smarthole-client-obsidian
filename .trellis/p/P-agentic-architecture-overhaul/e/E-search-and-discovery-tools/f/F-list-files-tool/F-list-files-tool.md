---
id: F-list-files-tool
title: List Files Tool
status: open
priority: high
parent: E-search-and-discovery-tools
prerequisites: []
affectedFiles: {}
log: []
schema: v1.0
childrenIds: []
created: 2026-02-04T04:19:51.965Z
updated: 2026-02-04T04:19:51.965Z
---

# List Files Tool

## Purpose

Create a `list_files` tool for glob-based file listing, allowing the agent to explore vault structure and find files by pattern.

## Implementation

Create `src/llm/tools/listFiles.ts` following the existing tool pattern.

### Tool Definition

```typescript
name: "list_files"
description: "List files and folders matching a glob pattern. Returns paths sorted by modification time (most recent first)."
```

### Input Schema

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `pattern` | string | No | Glob pattern to match (default: `*` for current directory) |
| `path` | string | No | Base path to search from (default: vault root) |

### Key Implementation Details

1. **Glob Matching**: Use a glob library or implement basic matching for patterns like `*.md`, `**/*.md`, `Projects/**`
2. **Sorted Output**: Sort results by modification time (most recent first) using `app.vault.adapter.stat()`
3. **File/Folder Indication**: Include type indicator (file or folder)
4. **Protected Paths**: Exclude `.obsidian/` and `.smarthole/` from results using `isProtectedPath()`
5. **Empty Directories**: Return appropriate message when no matches found

### Output Format

```
Found N items:

[folder] Projects/
[file] Projects/project-a.md (modified: 2026-02-03)
[file] Projects/project-b.md (modified: 2026-02-01)
[folder] Archive/
[file] notes.md (modified: 2026-01-30)
```

Or for empty results:
```
No files or folders match the pattern "*.xyz" in "Projects/"
```

### Integration

1. Export `createListFilesTool(app: App): ToolHandler` function
2. Add to `index.ts` exports and `createVaultTools()` array

## Technical Notes

- Use `app.vault.getAllLoadedFiles()` to get all files/folders
- Use `app.vault.adapter.stat()` to get modification times
- Consider using `minimatch` or `picomatch` for glob matching (check if already available, otherwise implement basic glob)

## Acceptance Criteria

- [ ] Supports glob patterns (e.g., `*.md`, `**/*.md`, `Projects/**`)
- [ ] Returns files sorted by modification time (most recent first)
- [ ] Includes type indicator (file vs folder)
- [ ] Handles empty directories gracefully with clear message
- [ ] Excludes protected folders from results
- [ ] Follows existing tool patterns