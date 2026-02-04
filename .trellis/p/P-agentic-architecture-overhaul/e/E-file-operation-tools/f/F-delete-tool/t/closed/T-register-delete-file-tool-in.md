---
id: T-register-delete-file-tool-in
title: Register delete_file tool in index
status: done
priority: medium
parent: F-delete-tool
prerequisites:
  - T-implement-delete-file-tool
affectedFiles:
  src/llm/tools/index.ts: Added import for createDeleteFileTool, added to
    createVaultTools() array, and added re-export
log:
  - Registered the delete_file tool in the tools index by adding the import
    statement, including it in the createVaultTools() array, and adding the
    re-export for selective use.
schema: v1.0
childrenIds: []
created: 2026-02-04T03:39:12.806Z
updated: 2026-02-04T03:39:12.806Z
---

Update `src/llm/tools/index.ts` to import and export the new `deleteFile` tool.

## Changes Required

1. Add import statement:
   ```typescript
   import { createDeleteFileTool } from "./deleteFile";
   ```

2. Add to `createVaultTools()` array:
   ```typescript
   createDeleteFileTool(app),
   ```

3. Add re-export:
   ```typescript
   export { createDeleteFileTool } from "./deleteFile";
   ```

## Acceptance Criteria
- [ ] `createDeleteFileTool` is imported from `./deleteFile`
- [ ] `createDeleteFileTool(app)` is included in `createVaultTools()` return array
- [ ] `createDeleteFileTool` is re-exported for selective use