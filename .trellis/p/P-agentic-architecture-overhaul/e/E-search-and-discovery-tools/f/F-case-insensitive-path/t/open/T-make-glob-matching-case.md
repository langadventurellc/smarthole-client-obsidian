---
id: T-make-glob-matching-case
title: Make glob matching case-insensitive in pathUtils.ts
status: open
priority: high
parent: F-case-insensitive-path
prerequisites: []
affectedFiles: {}
log: []
schema: v1.0
childrenIds: []
created: 2026-02-04T05:22:46.894Z
updated: 2026-02-04T05:22:46.894Z
---

# Make Glob Matching Case-Insensitive

## Overview

Update the glob pattern matching in `pathUtils.ts` to be case-insensitive so that patterns like `*.MD` match files like `note.md`.

## Current Implementation

In `pathUtils.ts`, the `globToRegex()` function creates a case-sensitive regex:

```typescript
// Line 64
return new RegExp(`^${pattern}$`);
```

## Required Change

Add the `'i'` flag to make the regex case-insensitive:

```typescript
return new RegExp(`^${pattern}$`, 'i');
```

## File Location

`src/llm/tools/pathUtils.ts` - `globToRegex()` function (line 38-65)

## Impact

This change affects all tools that use `matchGlob()`:
- `list_files` - file/folder pattern matching
- `search_files` - file_pattern parameter

## Acceptance Criteria

- [ ] `globToRegex()` returns a case-insensitive regex
- [ ] `matchGlob("Note.MD", "*.md")` returns true
- [ ] `matchGlob("Projects/tasks.md", "projects/**")` returns true
- [ ] Existing exact-case matches continue to work