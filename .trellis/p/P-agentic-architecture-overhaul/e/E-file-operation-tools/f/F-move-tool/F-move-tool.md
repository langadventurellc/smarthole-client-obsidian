---
id: F-move-tool
title: Move Tool
status: open
priority: medium
parent: E-file-operation-tools
prerequisites:
  - F-read-file-tool
affectedFiles: {}
log: []
schema: v1.0
childrenIds: []
created: 2026-02-04T02:04:03.333Z
updated: 2026-02-04T02:04:03.333Z
---

Implement the `move` tool for renaming and moving files and folders in the vault.

## Scope

### Move Tool (src/llm/tools/move.ts)
- Move files to different locations
- Rename files (move to same directory with different name)
- Move folders with all contents
- Auto-create destination parent directories
- Return clear error if source doesn't exist
- Return clear error if destination already exists
- Call `assertNotProtected()` for both source AND destination paths
- Follow existing tool pattern: factory function returning `ToolHandler`

## Acceptance Criteria
- [ ] `move` renames files in same directory
- [ ] `move` moves files to different directories
- [ ] `move` moves folders with all contents
- [ ] `move` auto-creates destination parent directories
- [ ] `move` errors when source doesn't exist
- [ ] `move` errors when destination already exists
- [ ] `move` blocks operations involving protected folders (source or destination)
- [ ] `move` returns confirmation with old and new paths

## Technical Notes
- Use `app.fileManager.renameFile()` for moving/renaming (works for both files and folders)
- Use `app.vault.getAbstractFileByPath()` to get file or folder
- Create parent directories using `app.vault.createFolder()` if needed
- Handle edge cases: moving to same path should be a no-op or clear message