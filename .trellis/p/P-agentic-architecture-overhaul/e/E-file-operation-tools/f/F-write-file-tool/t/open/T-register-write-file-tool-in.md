---
id: T-register-write-file-tool-in
title: Register write_file tool in index
status: open
priority: high
parent: F-write-file-tool
prerequisites:
  - T-implement-write-file-tool
affectedFiles: {}
log: []
schema: v1.0
childrenIds: []
created: 2026-02-04T02:56:02.957Z
updated: 2026-02-04T02:56:02.957Z
---

Update `src/llm/tools/index.ts` to export and include the new `write_file` tool.

## Changes Required

### Import
Add import for the new tool:
```typescript
import { createWriteFileTool } from "./writeFile";
```

### createVaultTools Function
Add the new tool to the array returned by `createVaultTools()`:
```typescript
createWriteFileTool(app),
```

### Re-export
Add re-export at the bottom of the file:
```typescript
export { createWriteFileTool } from "./writeFile";
```

## Acceptance Criteria
- [ ] `createWriteFileTool` is imported from `./writeFile`
- [ ] `createWriteFileTool(app)` is added to `createVaultTools()` array
- [ ] `createWriteFileTool` is re-exported for selective use