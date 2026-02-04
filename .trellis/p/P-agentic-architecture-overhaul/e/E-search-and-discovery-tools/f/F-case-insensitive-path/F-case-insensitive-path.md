---
id: F-case-insensitive-path
title: Case-Insensitive Path Resolution
status: done
priority: medium
parent: E-search-and-discovery-tools
prerequisites:
  - F-get-file-info-tool
affectedFiles:
  src/llm/tools/pathUtils.ts: Added InsensitiveLookupResult<T> interface,
    findFileInsensitive(), and findFolderInsensitive() helper functions for
    case-insensitive file and folder lookup. Also added import for App, TFile,
    TFolder from 'obsidian'.; Added 'i' flag to RegExp constructor in
    globToRegex() function (line 66) to enable case-insensitive pattern matching
  src/llm/tools/protected.ts: Added case-insensitive comparison by normalizing
    paths to lowercase before checking against PROTECTED_FOLDERS. Updated
    isProtectedPath() and assertNotProtected() functions. Enhanced docstring
    examples to document case-insensitive behavior.
  src/llm/tools/readFile.ts: Added import for findFileInsensitive from
    pathUtils.ts. Replaced app.vault.getFileByPath() with findFileInsensitive()
    for case-insensitive file lookup. Added handling for ambiguous paths
    (multiple case-insensitive matches) with a helpful error message.
  src/llm/tools/listFiles.ts: Added import for findFolderInsensitive from
    pathUtils. Replaced direct folder lookup with case-insensitive version that
    handles ambiguous paths (multiple case-insensitive matches) with a helpful
    error message.
  src/llm/tools/getFileInfo.ts: Added imports for findFileInsensitive and
    findFolderInsensitive from pathUtils. Replaced direct adapter.stat() call
    with case-insensitive file/folder lookup pattern. Now tries file lookup
    first, then folder lookup, with proper ambiguity handling and resolved path
    display in output.
log:
  - "Auto-completed: All child tasks are complete"
schema: v1.0
childrenIds:
  - T-add-case-insensitive-path
  - T-make-glob-matching-case
  - T-make-protected-path-checking
  - T-update-get-file-info-tool-to
  - T-update-list-files-tool-to-use
  - T-update-read-file-tool-to-use
created: 2026-02-04T05:07:02.971Z
updated: 2026-02-04T05:07:02.971Z
---

# Case-Insensitive Path Resolution

## Purpose

Make read operations case-insensitive to improve usability with speech-to-text input and reduce friction when users don't remember exact casing of file/folder names.

## Problem Statement

All vault path lookups are currently case-sensitive via Obsidian's API (`getFileByPath`, `getFolderByPath`, `getAbstractFileByPath`). When a user says "list files in projects" via speech-to-text, it fails because the folder is actually named "Projects".

## Scope

**Read operations only** - operations that look up existing files/folders:
- `list_files` - base path lookup
- `read_file` - file path lookup
- `search_files` - glob pattern matching (file_pattern parameter)
- `get_file_info` - file/folder path lookup

**Excluded** (keep case-sensitive):
- Write operations (`create_note`, `write_file`) - user specifies intended casing
- Move/rename operations (`move_file`, `organize_note`) - user specifies target casing
- Delete operations (`delete_file`) - user should be explicit

## Implementation

### 1. Add Helper Functions to `pathUtils.ts`

Create case-insensitive lookup wrappers:

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

**Behavior:**
1. Try exact match first (fast path)
2. If no exact match, enumerate all files/folders and find case-insensitive match
3. If exactly one case-insensitive match exists, return it
4. If multiple matches exist (e.g., both "Projects" and "projects"), return null with ambiguity (let caller handle with error message)

### 2. Make Glob Matching Case-Insensitive

Update `matchGlob()` in `pathUtils.ts` to use case-insensitive regex matching:

```typescript
// In globToRegex(), add 'i' flag for case-insensitive matching
return new RegExp(`^${regexPattern}$`, 'i');
```

### 3. Update Tool Files

**`readFile.ts`:**
- Replace `app.vault.getFileByPath(filePath)` with `findFileInsensitive(app, filePath)`
- Update error message to mention case-insensitivity if ambiguous

**`listFiles.ts`:**
- Replace `app.vault.getFolderByPath(basePath)` with `findFolderInsensitive(app, basePath)`
- Glob matching already uses `matchGlob()` which will be case-insensitive

**`searchFiles.ts`:**
- Glob matching already uses `matchGlob()` which will be case-insensitive

**`getFileInfo.ts`:**
- Use `findFileInsensitive()` / `findFolderInsensitive()` for path lookup

### 4. Update Protected Path Checking

In `protected.ts`, ensure `isProtectedPath()` checks case-insensitively:

```typescript
// Normalize to lowercase for comparison
const normalizedLower = normalized.toLowerCase();
return PROTECTED_FOLDERS.some(
  (folder) => normalizedLower === folder || normalizedLower.startsWith(`${folder}/`)
);
```

## Edge Cases

1. **Ambiguous paths**: If both "Projects" and "projects" exist, return an error asking the user to specify the exact casing
2. **Exact match priority**: Always prefer exact match when available
3. **Performance**: Case-insensitive lookup requires enumerating files, but this is acceptable for user-facing operations (vault sizes are typically small)

## Acceptance Criteria

- [ ] `read_file` finds files regardless of path casing
- [ ] `list_files` finds folders regardless of path casing
- [ ] `search_files` glob patterns match files regardless of casing
- [ ] `get_file_info` finds files/folders regardless of path casing
- [ ] Exact matches are preferred over case-insensitive matches
- [ ] Ambiguous paths (multiple case-insensitive matches) produce clear error messages
- [ ] Protected path checking works case-insensitively
- [ ] Write/move/delete operations remain case-sensitive

## Testing Requirements

- Verify case-insensitive lookup works for files and folders
- Verify exact match is preferred when available
- Verify ambiguous paths produce clear errors
- Verify protected paths are blocked regardless of casing (`.Obsidian/` should be blocked)

## Technical Notes

- Use `app.vault.getAllLoadedFiles()` to enumerate all files/folders for case-insensitive lookup
- Use `app.vault.getFiles()` for file-only enumeration
- Path comparison should normalize separators before case comparison