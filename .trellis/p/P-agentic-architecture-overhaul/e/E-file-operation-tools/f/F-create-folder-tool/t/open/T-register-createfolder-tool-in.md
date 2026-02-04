---
id: T-register-createfolder-tool-in
title: Register createFolder tool in index.ts
status: open
priority: medium
parent: F-create-folder-tool
prerequisites:
  - T-implement-createfolder-tool
affectedFiles: {}
log: []
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