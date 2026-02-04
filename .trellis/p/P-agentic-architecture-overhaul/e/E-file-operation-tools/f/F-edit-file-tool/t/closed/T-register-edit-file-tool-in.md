---
id: T-register-edit-file-tool-in
title: Register edit_file tool in vault tools index
status: done
priority: medium
parent: F-edit-file-tool
prerequisites:
  - T-implement-edit-file-tool-with
affectedFiles:
  src/llm/tools/index.ts: Added import and export for createEditFileTool, added to
    createVaultTools array (completed in T-implement-edit-file-tool-with)
log:
  - "Task completed as part of T-implement-edit-file-tool-with - the edit_file
    tool was registered in index.ts during the initial implementation: imported
    createEditFileTool, added to createVaultTools() array, and added re-export."
schema: v1.0
childrenIds: []
created: 2026-02-04T02:26:15.177Z
updated: 2026-02-04T02:26:15.177Z
---

Export the edit_file tool from the vault tools index so it can be used by LLMService.

## Implementation Details

Update `src/llm/tools/index.ts` to:
1. Import `createEditFileTool` from `./editFile`
2. Add `createEditFileTool(app)` to the `createVaultTools()` return array
3. Add re-export: `export { createEditFileTool } from "./editFile";`

Follow the existing pattern used for readFile and other tools.

## Files to Modify
- `src/llm/tools/index.ts`

## Acceptance Criteria
- [ ] `createEditFileTool` is imported in index.ts
- [ ] `createEditFileTool(app)` is included in `createVaultTools()` array
- [ ] `createEditFileTool` is re-exported for selective use