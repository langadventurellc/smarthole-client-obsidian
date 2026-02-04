---
id: T-register-createfolder-tool-in
title: Register createFolder tool in index.ts
status: done
priority: medium
parent: F-create-folder-tool
prerequisites:
  - T-implement-createfolder-tool
affectedFiles:
  src/llm/tools/index.ts: Added import for createCreateFolderTool, added it to
    createVaultTools() array, and added re-export
log:
  - Registered the createFolder tool in index.ts by adding the import, including
    it in the createVaultTools() array, and re-exporting the factory function
    for selective use. All quality checks (lint, format, type-check) pass.
schema: v1.0
childrenIds: []
created: 2026-02-04T03:08:11.746Z
updated: 2026-02-04T03:08:11.746Z
---

Update `src/llm/tools/index.ts` to export and register the `createFolder` tool.

## Changes Required

### 1. Add Import
```typescript
import { createCreateFolderTool } from "./createFolder";
```

### 2. Add to createVaultTools Array
```typescript
export function createVaultTools(app: App): ToolHandler[] {
  return [
    createCreateNoteTool(app),
    createModifyNoteTool(app),
    createSearchNotesTool(app),
    createOrganizeNoteTool(app),
    createReadFileTool(app),
    createEditFileTool(app),
    createWriteFileTool(app),
    createCreateFolderTool(app),  // Add this line
  ];
}
```

### 3. Add Re-export
```typescript
export { createCreateFolderTool } from "./createFolder";
```

## Acceptance Criteria
- [ ] `createCreateFolderTool` is imported from `./createFolder`
- [ ] Tool is included in the `createVaultTools()` return array
- [ ] Factory function is re-exported for selective use