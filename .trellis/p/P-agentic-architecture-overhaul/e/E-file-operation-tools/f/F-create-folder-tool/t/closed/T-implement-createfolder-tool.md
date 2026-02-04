---
id: T-implement-createfolder-tool
title: Implement createFolder tool
status: done
priority: medium
parent: F-create-folder-tool
prerequisites: []
affectedFiles:
  src/llm/tools/createFolder.ts: Created new file implementing the create_folder
    tool with path validation, normalization, protected path blocking, and
    folder creation via Obsidian vault API
log:
  - "Implemented the createFolder tool that creates folders in the Obsidian
    vault. The tool follows the established pattern from writeFile.ts with a
    factory function returning a ToolHandler. Key features: validates path
    input, normalizes paths (trim whitespace, remove trailing slashes), blocks
    protected directories (.obsidian/, .smarthole/), returns informative message
    when folder already exists (not an error), handles empty/root paths
    gracefully, and uses vault.createFolder() which auto-creates parent
    directories."
schema: v1.0
childrenIds: []
created: 2026-02-04T03:08:08.215Z
updated: 2026-02-04T03:08:08.215Z
---

Create `src/llm/tools/createFolder.ts` implementing the `create_folder` tool.

## Implementation Details

### Tool Definition
```typescript
const toolDefinition: Tool = {
  name: "create_folder",
  description: "Create a folder in the vault. Parent directories are created automatically if they don't exist.",
  inputSchema: {
    type: "object",
    properties: {
      path: {
        type: "string",
        description: "Path to the folder to create (e.g., 'folder/subfolder').",
      },
    },
    required: ["path"],
  },
};
```

### Execute Function Logic
1. Validate input path (required, must be a string)
2. Normalize path: trim whitespace, remove trailing slashes
3. **Validate normalized path is not empty** (after normalization, check that path is non-empty; return error if empty/root)
4. Call `assertNotProtected(path)` to block protected directories
5. Check if folder already exists using `app.vault.getFolderByPath(path)`
   - If exists: return informative message like `Folder "path" already exists.`
6. Create folder using `app.vault.createFolder(path)` (auto-creates parents)
7. Return confirmation: `Created folder "path".`

### Edge Cases
- **Empty path after normalization**: If path is empty string, "/", or whitespace-only, return error: "Error: path cannot be empty or root."
- **Root folder**: Cannot create root folder - handled by empty path check

### Pattern Reference
Follow the pattern in `writeFile.ts`:
- Factory function: `createCreateFolderTool(app: App): ToolHandler`
- Import `assertNotProtected` from `./protected`
- Return errors as strings (not thrown exceptions)

## Acceptance Criteria
- [ ] Tool creates single folders
- [ ] Tool creates parent directories automatically
- [ ] Tool returns confirmation with folder path
- [ ] Tool returns informative message if folder already exists (not error)
- [ ] Tool blocks creation in protected folders (.obsidian/, .smarthole/)
- [ ] Tool handles empty/root path gracefully with error message