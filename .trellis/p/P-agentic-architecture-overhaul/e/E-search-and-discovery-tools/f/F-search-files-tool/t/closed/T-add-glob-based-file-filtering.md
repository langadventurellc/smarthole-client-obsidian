---
id: T-add-glob-based-file-filtering
title: Add glob-based file filtering to searchFiles tool
status: done
priority: high
parent: F-search-files-tool
prerequisites:
  - T-create-searchfiles-tool-with
affectedFiles:
  src/llm/tools/searchFiles.ts: Added globToRegex() function to convert glob
    patterns to RegExp, matchGlob() function to test file paths against
    patterns, and integrated glob filtering into the execute function. Updated
    the file_pattern parameter description to reflect the implemented behavior.
log:
  - Added glob-based file filtering to the searchFiles tool. Implemented a
    simple glob-to-regex converter that supports the required patterns (*.ext,
    folder/*, folder/**, **/*.ext, **). When the file_pattern parameter is
    provided, the tool now searches all vault files matching the glob pattern.
    When omitted, it defaults to searching only markdown files. Protected paths
    (.obsidian/, .smarthole/) remain excluded regardless of the file pattern.
schema: v1.0
childrenIds: []
created: 2026-02-04T04:24:44.606Z
updated: 2026-02-04T04:24:44.606Z
---

# Add Glob-Based File Filtering

## Overview

Add support for the `file_pattern` parameter in the searchFiles tool to filter which files are searched using glob patterns.

## Implementation

### Glob Matching Strategy

Since Obsidian doesn't provide a built-in glob matcher, implement simple glob matching:

1. **Option A - Simple Implementation**: 
   - Support basic patterns: `*.md`, `**/*.md`, `folder/*`, `folder/**`
   - Implement using string manipulation and `String.match()` with converted regex

2. **Option B - Use picomatch/micromatch**:
   - If the project already has a glob library dependency, use it
   - If not, prefer simple implementation to avoid new dependencies

### Pattern Behavior

- `*.md` - Match files with .md extension in root only
- `**/*.md` - Match .md files in any directory
- `Projects/*` - Match files directly in Projects folder
- `Projects/**` - Match files anywhere under Projects folder
- `**/*.{md,txt}` - Match multiple extensions (if using library)

### Integration Point

In the execute function:

```typescript
// Get files to search
let files = app.vault.getFiles(); // All files, not just markdown

// Apply file pattern filter if provided
if (filePattern) {
  files = files.filter(file => matchGlob(file.path, filePattern));
}

// Exclude protected paths
files = files.filter(file => !isProtectedPath(file.path));
```

## Files to Modify

- `src/llm/tools/searchFiles.ts`

## Acceptance Criteria

- [ ] `file_pattern` parameter filters which files are searched
- [ ] Supports at minimum: `*.ext`, `folder/*`, `folder/**`, `**/*.ext` patterns
- [ ] When `file_pattern` is not provided, searches all markdown files
- [ ] When `file_pattern` is provided, searches matching files (any extension)
- [ ] Protected paths are still excluded regardless of file pattern