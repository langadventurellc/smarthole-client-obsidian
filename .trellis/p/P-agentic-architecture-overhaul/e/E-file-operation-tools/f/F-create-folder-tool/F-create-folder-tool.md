---
id: F-create-folder-tool
title: Create Folder Tool
status: done
priority: medium
parent: E-file-operation-tools
prerequisites:
  - F-read-file-tool
affectedFiles:
  src/llm/tools/createFolder.ts: Created new file implementing the create_folder
    tool with path validation, normalization, protected path blocking, and
    folder creation via Obsidian vault API
  src/llm/tools/index.ts: Added import for createCreateFolderTool, added it to
    createVaultTools() array, and added re-export
log:
  - "Auto-completed: All child tasks are complete"
schema: v1.0
childrenIds:
  - T-implement-createfolder-tool
  - T-register-createfolder-tool-in
created: 2026-02-04T02:04:18.851Z
updated: 2026-02-04T02:04:18.851Z
---

Implement the `create_folder` tool for creating folder structures in the vault.

## Scope

### Create Folder Tool (src/llm/tools/createFolder.ts)
- Create single folders
- Create nested folder structures (parent directories created automatically)
- Return confirmation with created folder path
- Return appropriate message if folder already exists (not an error)
- Call `assertNotProtected()` before creating
- Follow existing tool pattern: factory function returning `ToolHandler`

## Acceptance Criteria
- [ ] `create_folder` creates single folder
- [ ] `create_folder` creates parent directories as needed
- [ ] `create_folder` returns confirmation with folder path
- [ ] `create_folder` returns informative message if folder already exists
- [ ] `create_folder` blocks creation in protected folders

## Technical Notes
- Use `app.vault.createFolder()` for creation
- Use `app.vault.getFolderByPath()` to check if exists
- `createFolder()` automatically creates parent directories
- Normalize path (remove trailing slashes, handle empty path)