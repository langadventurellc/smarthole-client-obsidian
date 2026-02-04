---
id: F-create-folder-tool
title: Create Folder Tool
status: open
priority: medium
parent: E-file-operation-tools
prerequisites:
  - F-read-file-tool
affectedFiles: {}
log: []
schema: v1.0
childrenIds: []
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