---
id: T-update-read-file-tool-to-use
title: Update read_file tool to use case-insensitive path lookup
status: open
priority: medium
parent: F-case-insensitive-path
prerequisites:
  - T-add-case-insensitive-path
affectedFiles: {}
log: []
schema: v1.0
childrenIds: []
created: 2026-02-04T05:23:00.240Z
updated: 2026-02-04T05:23:00.240Z
---

# Update read_file Tool for Case-Insensitive Paths

## Overview

Update the `read_file` tool to use `findFileInsensitive()` instead of `app.vault.getFileByPath()` so that file paths can be resolved regardless of casing.

## Current Implementation

In `readFile.ts`, line 83:

```typescript
const file = app.vault.getFileByPath(filePath);
if (!file) {
  return `Error: File not found: "${filePath}"`;
}
```

## Required Changes

1. Import `findFileInsensitive` from `./pathUtils`
2. Replace the direct lookup with the case-insensitive helper
3. Handle the ambiguous case with a helpful error message

```typescript
import { findFileInsensitive } from "./pathUtils";

// ...

const result = findFileInsensitive(app, filePath);
if (!result.file) {
  if (result.ambiguous) {
    return `Error: Multiple files match "${filePath}" with different casing. Please specify the exact path.`;
  }
  return `Error: File not found: "${filePath}"`;
}
const file = result.file;
```

## File Location

`src/llm/tools/readFile.ts`

## Dependencies

- Depends on T-add-case-insensitive-helpers being completed first

## Acceptance Criteria

- [ ] `read_file` with path "notes/readme.md" finds "Notes/README.md"
- [ ] Exact matches are still found directly (fast path)
- [ ] Ambiguous paths produce clear error messages
- [ ] Error messages are helpful for speech-to-text users