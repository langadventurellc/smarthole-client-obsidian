---
id: T-implement-protected-path
title: Implement Protected Path Utility
status: done
priority: high
parent: F-read-file-tool
prerequisites: []
affectedFiles:
  src/llm/tools/protected.ts: Created new protected path utility with
    isProtectedPath(), assertNotProtected(), and internal normalizePath()
    functions
log:
  - |-
    Starting implementation. Research complete:
    - Verified src/llm/tools/ directory exists
    - Reviewed existing tool patterns (createNote.ts, modifyNote.ts)
    - Read requirements from docs/requirements-agentic-architecture.md
    - No test framework configured (mise.toml shows "No tests configured yet")
  - Implemented the protected path utility with isProtectedPath() and
    assertNotProtected() functions. The utility normalizes paths (handles
    backslashes, leading/trailing slashes) and blocks access to .obsidian/ and
    .smarthole/ directories at the vault root. All quality checks pass (lint,
    format, type-check).
schema: v1.0
childrenIds: []
created: 2026-02-04T02:09:52.244Z
updated: 2026-02-04T02:09:52.244Z
---

Create `src/llm/tools/protected.ts` with shared utility functions for protecting sensitive directories from file operation tools.

## Implementation

Create new file `src/llm/tools/protected.ts` with:

### `isProtectedPath(relativePath: string): boolean`
- Returns `true` if path starts with or is within `.obsidian/` or `.smarthole/` directories
- Must normalize paths before checking:
  - Convert backslashes to forward slashes
  - Remove trailing slashes
  - Handle leading slashes (both `/path` and `path` formats)
- Case-sensitive matching (Obsidian is case-sensitive on most platforms)

### `assertNotProtected(path: string): void`
- Calls `isProtectedPath()` internally
- Throws `Error` with descriptive message if path is protected
- Error message should be user-friendly: e.g., "Access denied: Cannot access files in '.obsidian/' directory (protected system folder)"

### Path normalization helper (internal)
- `normalizePath(path: string): string` - internal helper to normalize paths consistently

## Test Cases to Consider
- `.obsidian/config` → protected
- `.obsidian` (exact match) → protected
- `.smarthole/inbox/msg.json` → protected
- `notes/.obsidian/file.md` → NOT protected (not at root)
- `my.obsidian.notes/file.md` → NOT protected (not the folder)
- `folder/file.md` → NOT protected
- `\\path\\to\\.obsidian\\file` → protected (backslash normalization)

## Acceptance Criteria
- [ ] `isProtectedPath()` correctly identifies `.obsidian/` paths
- [ ] `isProtectedPath()` correctly identifies `.smarthole/` paths
- [ ] `assertNotProtected()` throws descriptive error for protected paths
- [ ] Paths are normalized (backslashes, trailing slashes handled)

## Files to Create
- `src/llm/tools/protected.ts`