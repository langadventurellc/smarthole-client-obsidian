---
id: T-register-searchfiles-tool-in
title: Register searchFiles tool in index.ts
status: done
priority: high
parent: F-search-files-tool
prerequisites:
  - T-add-glob-based-file-filtering
affectedFiles:
  src/llm/tools/index.ts: Added import for createSearchFilesTool from
    ./searchFiles, added createSearchFilesTool(app) to the createVaultTools()
    return array, and added re-export statement for selective use
log:
  - Registered the searchFiles tool in index.ts by adding the import, including
    it in the createVaultTools() array, and adding the re-export. All quality
    checks (lint, format, type-check) pass.
schema: v1.0
childrenIds: []
created: 2026-02-04T04:24:48.841Z
updated: 2026-02-04T04:24:48.841Z
---

# Register searchFiles Tool

## Overview

Add the searchFiles tool to the vault tools index so it becomes available to the LLM.

## Implementation

### Import Statement

Add to the imports at the top of `src/llm/tools/index.ts`:

```typescript
import { createSearchFilesTool } from "./searchFiles";
```

### Array Registration

Add to the `createVaultTools()` return array:

```typescript
createSearchFilesTool(app),
```

### Re-export

Add to the re-exports at the bottom:

```typescript
export { createSearchFilesTool } from "./searchFiles";
```

## Files to Modify

- `src/llm/tools/index.ts`

## Acceptance Criteria

- [ ] `createSearchFilesTool` is imported from "./searchFiles"
- [ ] `createSearchFilesTool(app)` is included in `createVaultTools()` array
- [ ] `createSearchFilesTool` is re-exported for selective use
- [ ] `mise run quality` passes (no lint/type errors)