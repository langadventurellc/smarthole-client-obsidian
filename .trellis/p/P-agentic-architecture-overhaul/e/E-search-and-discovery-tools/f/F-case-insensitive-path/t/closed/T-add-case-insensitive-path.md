---
id: T-add-case-insensitive-path
title: Add case-insensitive path lookup helpers to pathUtils.ts
status: done
priority: high
parent: F-case-insensitive-path
prerequisites: []
affectedFiles:
  src/llm/tools/pathUtils.ts: Added InsensitiveLookupResult<T> interface,
    findFileInsensitive(), and findFolderInsensitive() helper functions for
    case-insensitive file and folder lookup. Also added import for App, TFile,
    TFolder from 'obsidian'.
log:
  - >-
    Completed research phase:


    1. Verified pathUtils.ts exists at src/llm/tools/pathUtils.ts with:
       - normalizePath() - handles path normalization
       - globToRegex() - converts glob to regex
       - matchGlob() - tests path against glob pattern

    2. Studied existing tool patterns:
       - Tools use `import type { App, TFile } from "obsidian"` for types
       - app.vault.getFileByPath() - exact file lookup
       - app.vault.getFolderByPath() - exact folder lookup
       - app.vault.getAllLoadedFiles() - returns all TAbstractFile items
       - app.vault.getFiles() - returns only TFile items
       - TFile has .extension property, TFolder does not (used to distinguish types)

    3. No test framework in project - will focus on implementation only


    4. Patterns to follow:
       - JSDoc comments with @param, @returns
       - Type imports with "type" keyword
       - Error handling returns null rather than throwing

    Ready to implement findFileInsensitive() and findFolderInsensitive()
    functions.
  - >-
    Added case-insensitive path lookup helpers to pathUtils.ts:


    1. **InsensitiveLookupResult<T> interface** - A result type that includes:
       - `item: T | null` - The matched file/folder, or null if not found or ambiguous
       - `ambiguous: boolean` - Indicates if multiple case-insensitive matches exist

    2. **findFileInsensitive(app, path)** - Finds a file by path,
    case-insensitively:
       - Tries exact match first via `app.vault.getFileByPath()` (fast path)
       - Falls back to enumerating all files via `app.vault.getFiles()` for case-insensitive comparison
       - Returns `{ item: TFile, ambiguous: false }` for single match
       - Returns `{ item: null, ambiguous: true }` for multiple matches
       - Returns `{ item: null, ambiguous: false }` for no match
       - Handles empty paths gracefully

    3. **findFolderInsensitive(app, path)** - Finds a folder by path,
    case-insensitively:
       - Tries exact match first via `app.vault.getFolderByPath()` (fast path)
       - Falls back to enumerating via `app.vault.getAllLoadedFiles()` for case-insensitive comparison
       - Uses `"extension" in item` check to distinguish folders from files
       - Same result semantics as findFileInsensitive

    Both functions use `normalizePath()` for consistent path handling and
    include comprehensive JSDoc documentation with examples.
schema: v1.0
childrenIds: []
created: 2026-02-04T05:22:40.803Z
updated: 2026-02-04T05:22:40.803Z
---

# Add Case-Insensitive Path Lookup Helpers

## Overview

Add `findFileInsensitive()` and `findFolderInsensitive()` helper functions to `pathUtils.ts` that wrap Obsidian's case-sensitive lookup methods with case-insensitive fallback behavior.

## Implementation Details

### Functions to Add

```typescript
/**
 * Find a file by path, case-insensitively.
 * Prefers exact match, falls back to case-insensitive match.
 * Returns null if no match or if multiple case-insensitive matches exist.
 */
export function findFileInsensitive(app: App, path: string): TFile | null

/**
 * Find a folder by path, case-insensitively.
 * Prefers exact match, falls back to case-insensitive match.
 * Returns null if no match or if multiple case-insensitive matches exist.
 */
export function findFolderInsensitive(app: App, path: string): TFolder | null
```

### Behavior

1. Try exact match first using `app.vault.getFileByPath()` or `app.vault.getFolderByPath()` (fast path)
2. If no exact match, normalize the input path and enumerate all files/folders
3. Compare paths case-insensitively using `.toLowerCase()`
4. If exactly one case-insensitive match exists, return it
5. If multiple matches exist (e.g., both "Projects" and "projects"), return null

### Edge Cases

- Return type should include information about why null was returned (not found vs ambiguous)
- Consider returning a result object: `{ file: TFile | null, ambiguous: boolean }` or similar
- Handle empty paths gracefully

### File Location

`src/llm/tools/pathUtils.ts`

### Dependencies

- Will need to import `App`, `TFile`, `TFolder` from "obsidian"
- Uses existing `normalizePath()` function

## Acceptance Criteria

- [ ] `findFileInsensitive()` returns exact match when available
- [ ] `findFileInsensitive()` returns case-insensitive match when no exact match exists
- [ ] `findFileInsensitive()` returns null with ambiguity indicator when multiple matches exist
- [ ] `findFolderInsensitive()` has same behavior for folders
- [ ] Functions handle edge cases (empty path, root path)