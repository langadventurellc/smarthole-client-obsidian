---
id: F-delete-tool
title: Delete Tool
status: done
priority: medium
parent: E-file-operation-tools
prerequisites:
  - F-read-file-tool
affectedFiles:
  src/llm/tools/deleteFile.ts: Created new delete_file tool that soft-deletes
    files and folders to Obsidian's trash, following the existing tool pattern
    from writeFile.ts
  src/llm/tools/index.ts: Added import for createDeleteFileTool, added to
    createVaultTools() array, and added re-export
log:
  - "Auto-completed: All child tasks are complete"
schema: v1.0
childrenIds:
  - T-implement-delete-file-tool
  - T-register-delete-file-tool-in
created: 2026-02-04T02:04:13.116Z
updated: 2026-02-04T02:04:13.116Z
---

Implement the `delete` tool for soft-deleting files and folders to Obsidian's trash.

## Scope

### Delete Tool (src/llm/tools/delete.ts)
- Soft delete files using `app.vault.trash()` API
- Soft delete folders (with all contents)
- Respects user's Obsidian trash settings (system trash vs .trash folder)
- Return confirmation of what was deleted
- Return clear error if file/folder doesn't exist
- Call `assertNotProtected()` before deleting
- Follow existing tool pattern: factory function returning `ToolHandler`

## Acceptance Criteria
- [ ] `delete` soft deletes files to trash
- [ ] `delete` soft deletes folders with all contents
- [ ] `delete` uses `app.vault.trash()` (respects user settings)
- [ ] `delete` returns confirmation with deleted path
- [ ] `delete` errors when file doesn't exist
- [ ] `delete` blocks deletion of protected folders

## Technical Notes
- Use `app.vault.getAbstractFileByPath()` to get file or folder
- Use `app.vault.trash(file, useSystemTrash)` - the second parameter comes from user settings
- Obsidian settings for trash: `app.vault.config.trashOption` ('system', 'local', 'none')
- Return message like "Deleted 'notes/old-note.md' to trash"