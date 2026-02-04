---
id: T-make-protected-path-checking
title: Make protected path checking case-insensitive
status: done
priority: high
parent: F-case-insensitive-path
prerequisites: []
affectedFiles:
  src/llm/tools/protected.ts: Added case-insensitive comparison by normalizing
    paths to lowercase before checking against PROTECTED_FOLDERS. Updated
    isProtectedPath() and assertNotProtected() functions. Enhanced docstring
    examples to document case-insensitive behavior.
log:
  - Made protected path checking case-insensitive by normalizing paths to
    lowercase before comparing with PROTECTED_FOLDERS. Updated both
    `isProtectedPath()` and `assertNotProtected()` functions to use
    `toLowerCase()` on the normalized path before comparison. This security
    enhancement ensures that `.Obsidian/`, `.OBSIDIAN/`, `.SmartHole/`, and any
    other case variations of protected folders are properly blocked, preventing
    potential bypasses through different casing.
schema: v1.0
childrenIds: []
created: 2026-02-04T05:22:53.411Z
updated: 2026-02-04T05:22:53.411Z
---

# Make Protected Path Checking Case-Insensitive

## Overview

Update `isProtectedPath()` in `protected.ts` to check paths case-insensitively, ensuring that `.Obsidian/` and `.SMARTHOLE/` are blocked just like `.obsidian/` and `.smarthole/`.

## Current Implementation

In `protected.ts`, the check is case-sensitive:

```typescript
// Lines 36-38
return PROTECTED_FOLDERS.some(
  (folder) => normalized === folder || normalized.startsWith(`${folder}/`)
);
```

## Required Change

Normalize to lowercase for comparison:

```typescript
const normalizedLower = normalized.toLowerCase();
return PROTECTED_FOLDERS.some(
  (folder) => normalizedLower === folder || normalizedLower.startsWith(`${folder}/`)
);
```

Note: `PROTECTED_FOLDERS` already contains lowercase values: `[".obsidian", ".smarthole"]`

## File Location

`src/llm/tools/protected.ts` - `isProtectedPath()` function (lines 33-39)

## Security Consideration

This is a security enhancement - without this change, a user could potentially access protected folders by using different casing (e.g., `.Obsidian/config`).

## Acceptance Criteria

- [ ] `isProtectedPath('.Obsidian/config')` returns true
- [ ] `isProtectedPath('.OBSIDIAN')` returns true  
- [ ] `isProtectedPath('.SmartHole/inbox')` returns true
- [ ] Normal paths continue to work correctly
- [ ] `assertNotProtected()` correctly throws for case-variant protected paths