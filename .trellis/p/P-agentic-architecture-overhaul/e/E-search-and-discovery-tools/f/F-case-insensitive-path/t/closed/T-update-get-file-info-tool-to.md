---
id: T-update-get-file-info-tool-to
title: Update get_file_info tool to use case-insensitive path lookup
status: done
priority: medium
parent: F-case-insensitive-path
prerequisites:
  - T-add-case-insensitive-path
affectedFiles:
  src/llm/tools/getFileInfo.ts: Added imports for findFileInsensitive and
    findFolderInsensitive from pathUtils. Replaced direct adapter.stat() call
    with case-insensitive file/folder lookup pattern. Now tries file lookup
    first, then folder lookup, with proper ambiguity handling and resolved path
    display in output.
log:
  - >-
    ## Research Phase Complete


    ### Files Analyzed:

    1. **src/llm/tools/getFileInfo.ts** - Current implementation uses
    `app.vault.adapter.stat(targetPath)` directly (line 85), which is
    case-sensitive.


    2. **src/llm/tools/pathUtils.ts** - Contains the helper functions:
       - `findFileInsensitive(app, path)` - Returns `InsensitiveLookupResult<TFile>` with `item` and `ambiguous` properties
       - `findFolderInsensitive(app, path)` - Returns `InsensitiveLookupResult<TFolder>` with same structure

    3. **src/llm/tools/readFile.ts** - Reference implementation pattern:
       - Imports `findFileInsensitive` from `./pathUtils`
       - Uses `findFileInsensitive(app, filePath)` then checks `result.ambiguous` and `result.item`
       - Returns helpful error messages for ambiguous and not-found cases

    4. **src/llm/tools/listFiles.ts** - Reference implementation pattern for
    folders:
       - Imports `findFolderInsensitive` from `./pathUtils`
       - Uses similar pattern for folder lookup

    ### Implementation Plan:

    1. Add import for `findFileInsensitive` and `findFolderInsensitive` from
    `./pathUtils`

    2. Replace direct `adapter.stat(targetPath)` with case-insensitive lookup:
       - First try `findFileInsensitive(app, targetPath)`
       - If ambiguous, return error message
       - If found file, use `file.path` for stat call
       - If not found, try `findFolderInsensitive(app, targetPath)`
       - If ambiguous, return error message
       - If found folder, use `folder.path` for stat call
       - If neither found, return "Path not found" error
    3. Update output to show the actual resolved path (from matched item) rather
    than input path
  - >-
    Updated the get_file_info tool to use case-insensitive path lookup. The tool
    now imports findFileInsensitive and findFolderInsensitive from pathUtils.ts
    and uses them to resolve paths case-insensitively before calling
    adapter.stat(). The implementation:


    1. First tries case-insensitive file lookup with findFileInsensitive()

    2. If ambiguous (multiple matches with different casing), returns a clear
    error message

    3. If file found, uses the resolved path for stat and displays the actual
    path in output

    4. If no file match, tries case-insensitive folder lookup with
    findFolderInsensitive()

    5. If ambiguous folder match, returns a clear error message

    6. If folder found, uses the resolved path for stat and displays the actual
    path in output

    7. If neither found, returns "Path not found" error


    This ensures that get_file_info with path "notes/readme.md" will find
    "Notes/README.md" and display the correct resolved path in the output.
schema: v1.0
childrenIds: []
created: 2026-02-04T05:23:12.928Z
updated: 2026-02-04T05:23:12.928Z
---

# Update get_file_info Tool for Case-Insensitive Paths

## Overview

Update the `get_file_info` tool to use case-insensitive path lookup so that file and folder metadata can be retrieved regardless of path casing.

## Current Implementation

In `getFileInfo.ts`, line 85:

```typescript
const stat = await app.vault.adapter.stat(targetPath);

if (!stat) {
  return `Error: Path not found: "${targetPath}"`;
}
```

The `adapter.stat()` method is case-sensitive on most filesystems.

## Required Changes

1. Import `findFileInsensitive` and `findFolderInsensitive` from `./pathUtils`
2. Try to find the file or folder case-insensitively first
3. Use the resolved path for the stat call
4. Handle ambiguous cases

```typescript
import { findFileInsensitive, findFolderInsensitive } from "./pathUtils";

// ...

// Try to resolve the path case-insensitively
const fileResult = findFileInsensitive(app, targetPath);
const folderResult = findFolderInsensitive(app, targetPath);

let resolvedPath = targetPath;
let isAmbiguous = false;

if (fileResult.file) {
  resolvedPath = fileResult.file.path;
} else if (folderResult.folder) {
  resolvedPath = folderResult.folder.path;
} else if (fileResult.ambiguous || folderResult.ambiguous) {
  isAmbiguous = true;
}

if (isAmbiguous) {
  return `Error: Multiple items match "${targetPath}" with different casing. Please specify the exact path.`;
}

const stat = await app.vault.adapter.stat(resolvedPath);
// ...
```

## File Location

`src/llm/tools/getFileInfo.ts`

## Dependencies

- Depends on T-add-case-insensitive-helpers being completed first

## Acceptance Criteria

- [ ] `get_file_info` with path "notes/readme.md" finds "Notes/README.md"
- [ ] `get_file_info` with path "projects" finds folder "Projects"
- [ ] Exact matches are still found directly (fast path)
- [ ] Ambiguous paths produce clear error messages
- [ ] Output shows the actual resolved path (not the input path)