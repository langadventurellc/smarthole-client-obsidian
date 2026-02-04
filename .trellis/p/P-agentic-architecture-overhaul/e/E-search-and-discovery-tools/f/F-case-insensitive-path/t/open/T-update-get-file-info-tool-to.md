---
id: T-update-get-file-info-tool-to
title: Update get_file_info tool to use case-insensitive path lookup
status: open
priority: medium
parent: F-case-insensitive-path
prerequisites:
  - T-add-case-insensitive-path
affectedFiles: {}
log: []
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