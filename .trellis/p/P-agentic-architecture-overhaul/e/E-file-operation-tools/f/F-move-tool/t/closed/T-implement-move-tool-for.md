---
id: T-implement-move-tool-for
title: Implement move tool for file/folder renaming and relocation
status: done
priority: medium
parent: F-move-tool
prerequisites: []
affectedFiles:
  src/llm/tools/moveFile.ts: "Created new move_file tool with factory function
    createMoveFileTool(app: App). Includes path normalization,
    ensureParentFolder helper, input validation, protected path checking for
    both source and destination, existence checks, and the move operation using
    app.fileManager.renameFile()."
  src/llm/tools/index.ts: Added import for createMoveFileTool, included it in the
    createVaultTools() array, and added re-export for selective use.
log:
  - "Implemented the move_file tool for file/folder renaming and relocation. The
    tool follows the established pattern used by deleteFile.ts and writeFile.ts,
    providing: (1) input validation for source and destination paths, (2)
    protected path checking for both source AND destination using
    assertNotProtected(), (3) source existence verification, (4) destination
    collision detection, (5) same-path no-op handling with informative message,
    (6) automatic parent directory creation using the ensureParentFolder
    pattern, and (7) the actual move operation using
    app.fileManager.renameFile(). The tool is registered in index.ts and
    re-exported for selective use."
schema: v1.0
childrenIds: []
created: 2026-02-04T03:51:28.184Z
updated: 2026-02-04T03:51:28.184Z
---

Create the `move` tool (src/llm/tools/moveFile.ts) following the established tool pattern used by deleteFile.ts, writeFile.ts, and other tools.

## Implementation Requirements

### Tool Definition
- Name: `move_file` (consistent with `delete_file`, `write_file` naming)
- Input parameters:
  - `source` (string, required): Path to the file or folder to move
  - `destination` (string, required): New path for the file or folder

### Core Functionality
1. **Validate inputs**: Both source and destination must be non-empty strings
2. **Check protected paths**: Call `assertNotProtected()` for BOTH source AND destination paths
3. **Verify source exists**: Use `app.vault.getAbstractFileByPath(source)` - return error if not found
4. **Check destination doesn't exist**: Use `app.vault.getAbstractFileByPath(destination)` - return error if already exists
5. **Handle same-path case**: If source === destination (after normalization), return a no-op message
6. **Create parent directories**: Use the `ensureParentFolder` pattern from writeFile.ts to create destination parent directories if needed
7. **Execute move**: Use `app.fileManager.renameFile(abstractFile, destination)` - this works for both files and folders
8. **Return confirmation**: Include both old and new paths in success message

### Edge Cases
- Source doesn't exist → clear error message
- Destination already exists → clear error message  
- Same source and destination → no-op with informative message
- Missing parent directories → auto-create them
- Protected path (source or destination) → error via assertNotProtected

### Tool Registration
- Export `createMoveFileTool(app: App): ToolHandler` factory function
- Add import and include in `createVaultTools()` array in index.ts
- Add re-export in index.ts

## Files to Modify
1. **Create**: `src/llm/tools/moveFile.ts` - New tool implementation
2. **Modify**: `src/llm/tools/index.ts` - Add import, include in createVaultTools, add re-export

## Testing Criteria
- Renames files in same directory
- Moves files to different directories (with auto-created parents)
- Moves folders with all contents
- Errors when source doesn't exist
- Errors when destination already exists
- Blocks operations involving protected folders (source or destination)
- Returns confirmation with old and new paths