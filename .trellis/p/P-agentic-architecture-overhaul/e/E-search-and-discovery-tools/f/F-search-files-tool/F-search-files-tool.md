---
id: F-search-files-tool
title: Search Files Tool
status: done
priority: high
parent: E-search-and-discovery-tools
prerequisites: []
affectedFiles:
  src/llm/tools/searchFiles.ts: Created new search_files tool with regex-based
    content search, line context extraction, protected path filtering, and
    result formatting with line numbers; Added globToRegex() function to convert
    glob patterns to RegExp, matchGlob() function to test file paths against
    patterns, and integrated glob filtering into the execute function. Updated
    the file_pattern parameter description to reflect the implemented behavior.
  src/llm/tools/index.ts: Added import for createSearchFilesTool from
    ./searchFiles, added createSearchFilesTool(app) to the createVaultTools()
    return array, and added re-export statement for selective use
log:
  - "Auto-completed: All child tasks are complete"
schema: v1.0
childrenIds:
  - T-add-glob-based-file-filtering
  - T-create-searchfiles-tool-with
  - T-register-searchfiles-tool-in
created: 2026-02-04T04:19:40.194Z
updated: 2026-02-04T04:19:40.194Z
---

# Search Files Tool

## Purpose

Create a new `search_files` tool that provides regex-based content search across vault files. This complements the existing `search_notes` tool which uses `prepareSimpleSearch()` for simple text matching. Both tools will coexist:
- `search_notes`: Simple text search, user-friendly for natural language queries
- `search_files`: Regex search, powerful for precise pattern matching

## Implementation

Create `src/llm/tools/searchFiles.ts` following the existing tool pattern (see `readFile.ts`, `searchNotes.ts` for reference).

### Tool Definition

```typescript
name: "search_files"
description: "Search file contents using regex patterns. Returns matching file paths with excerpts showing context around matches."
```

### Input Schema

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `pattern` | string | Yes | Regex pattern to search for |
| `file_pattern` | string | No | Glob pattern to filter files (e.g., `*.md`, `Projects/**`) |
| `context_lines` | integer | No | Number of lines before/after match (default: 2) |
| `max_results` | integer | No | Maximum files to return (default: 10) |

### Key Implementation Details

1. **Regex Search**: Use JavaScript `RegExp` with the provided pattern
2. **File Filtering**: If `file_pattern` provided, filter files using glob matching before search
3. **Context Lines**: Extract lines before/after the match (not just characters like `searchNotes.ts`)
4. **Protected Paths**: Use `isProtectedPath()` to exclude results from `.obsidian/` and `.smarthole/`
5. **Result Limiting**: Cap results to prevent overwhelming output

### Output Format

```
Found N matching files:

## path/to/file.md
Line 42:   context line before
Line 43: > matching line with pattern
Line 44:   context line after

## path/to/other.md
...
```

### Integration

1. Export `createSearchFilesTool(app: App): ToolHandler` function
2. Add to `index.ts` exports and `createVaultTools()` array

## Acceptance Criteria

- [ ] Searches content with regex patterns
- [ ] Supports file pattern filtering via glob
- [ ] Supports configurable context lines (before/after match)
- [ ] Limits results to prevent overwhelming output
- [ ] Returns file paths with matching excerpts
- [ ] Excludes protected folders from results
- [ ] Handles invalid regex gracefully with clear error message
- [ ] Follows existing tool patterns (ToolHandler, inputSchema, etc.)