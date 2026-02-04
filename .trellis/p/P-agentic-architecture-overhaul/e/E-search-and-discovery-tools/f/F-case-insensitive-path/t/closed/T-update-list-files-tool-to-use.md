---
id: T-update-list-files-tool-to-use
title: Update list_files tool to use case-insensitive folder lookup
status: done
priority: medium
parent: F-case-insensitive-path
prerequisites:
  - T-add-case-insensitive-path
affectedFiles:
  src/llm/tools/listFiles.ts: Added import for findFolderInsensitive from
    pathUtils. Replaced direct folder lookup with case-insensitive version that
    handles ambiguous paths (multiple case-insensitive matches) with a helpful
    error message.
log:
  - >-
    Research completed:


    1. Verified pathUtils.ts contains the `findFolderInsensitive` function that
    returns `InsensitiveLookupResult<TFolder>` with:
       - `item: TFolder | null` - The matched folder
       - `ambiguous: boolean` - True if multiple case-insensitive matches exist

    2. Current listFiles.ts implementation (lines 137-143):
       - Uses `app.vault.getFolderByPath(basePath)` for folder lookup
       - Only checks if folder is null

    3. Pattern to follow from readFile.ts (lines 83-91):
       - Import `findFileInsensitive` from `./pathUtils`
       - Call the function and check `result.ambiguous` first
       - Then check `!result.item` for not found
       - Assign the item to a variable if needed

    4. Changes needed:
       - Add import for `findFolderInsensitive` from `./pathUtils`
       - Replace the folder lookup block with case-insensitive version
  - Updated the list_files tool to use case-insensitive folder lookup for the
    base path parameter. Added import for findFolderInsensitive from
    pathUtils.ts and replaced the direct app.vault.getFolderByPath() call with
    the case-insensitive helper. The implementation handles both ambiguous paths
    (multiple folders with different casing) and not-found cases with
    appropriate error messages.
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