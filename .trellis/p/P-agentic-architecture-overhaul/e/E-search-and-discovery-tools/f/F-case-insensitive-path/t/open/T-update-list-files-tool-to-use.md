---
id: T-update-list-files-tool-to-use
title: Update list_files tool to use case-insensitive folder lookup
status: open
priority: medium
parent: F-case-insensitive-path
prerequisites:
  - T-add-case-insensitive-path
affectedFiles: {}
log: []
schema: v1.0
childrenIds: []
created: 2026-02-04T05:23:06.411Z
updated: 2026-02-04T05:23:06.411Z
---

# Update list_files Tool for Case-Insensitive Paths

## Overview

Update the `list_files` tool to use `findFolderInsensitive()` instead of `app.vault.getFolderByPath()` so that base paths can be resolved regardless of casing.

## Current Implementation

In `listFiles.ts`, lines 138-143:

```typescript
if (basePath.length > 0) {
  const folder = app.vault.getFolderByPath(basePath);
  if (!folder) {
    return `Error: Path "${basePath}" does not exist or is not a folder.`;
  }
}
```

## Required Changes

1. Import `findFolderInsensitive` from `./pathUtils`
2. Replace the direct lookup with the case-insensitive helper
3. Handle the ambiguous case with a helpful error message

```typescript
import { findFolderInsensitive } from "./pathUtils";

// ...

if (basePath.length > 0) {
  const result = findFolderInsensitive(app, basePath);
  if (!result.folder) {
    if (result.ambiguous) {
      return `Error: Multiple folders match "${basePath}" with different casing. Please specify the exact path.`;
    }
    return `Error: Path "${basePath}" does not exist or is not a folder.`;
  }
  // Use result.folder.path for the actual path if needed
}
```

## File Location

`src/llm/tools/listFiles.ts`

## Dependencies

- Depends on T-add-case-insensitive-helpers being completed first

## Note on Glob Matching

The glob matching in `list_files` uses `matchGlob()` which will be made case-insensitive by T-make-glob-case-insensitive. This task only handles the base path lookup.

## Acceptance Criteria

- [ ] `list_files` with path "projects" finds folder "Projects"
- [ ] Exact folder matches are still found directly (fast path)
- [ ] Ambiguous folder paths produce clear error messages
- [ ] Combined with case-insensitive glob matching, patterns work regardless of casing