---
id: T-implement-read-file-tool
title: Implement Read File Tool
status: done
priority: high
parent: F-read-file-tool
prerequisites:
  - T-implement-protected-path
affectedFiles:
  src/llm/tools/readFile.ts: Created new read_file tool with path validation,
    protected path checking, line number formatting, optional line range
    filtering, and smart truncation for large files
  src/llm/tools/index.ts: Added import and export for createReadFileTool, added to
    createVaultTools() array
log:
  - |-
    Research phase complete:
    - Verified protected.ts exists with assertNotProtected() function
    - Reviewed existing tool patterns (createNote.ts, modifyNote.ts)
    - Confirmed ToolHandler interface in LLMService.ts
    - Confirmed Tool type in types.ts
    - Verified index.ts exports pattern for createVaultTools()
    - No tests framework configured (as noted in prerequisite task)

    Ready to implement read_file tool following established patterns.
  - >-
    Implemented the `read_file` tool for reading file contents from the vault.
    The tool:

    - Validates path input and checks for protected paths using
    `assertNotProtected()`

    - Returns content with line numbers in format "lineNum: content"

    - Supports optional `start_line` and `end_line` parameters for partial reads
    (1-indexed)

    - Truncates large files at ~100KB or 2000 lines with clear indication

    - Returns clear error messages for non-existent files, protected paths, and
    invalid line ranges

    - Follows the established tool pattern with factory function returning
    ToolHandler

    - Added to `createVaultTools()` array and exported from index.ts
schema: v1.0
childrenIds: []
created: 2026-02-04T02:10:04.655Z
updated: 2026-02-04T02:10:04.655Z
---

Create `src/llm/tools/readFile.ts` implementing the `read_file` tool for reading file contents from the vault.

## Implementation

Create new file `src/llm/tools/readFile.ts` following the existing tool pattern (see `createNote.ts` for reference).

### Tool Definition
```typescript
name: "read_file"
description: "Read the contents of a file from the vault. Returns content with line numbers."
inputSchema:
  - path (string, required): Path to the file to read
  - start_line (integer, optional): First line to read (1-indexed, inclusive)
  - end_line (integer, optional): Last line to read (1-indexed, inclusive)
```

### Factory Function: `createReadFileTool(app: App): ToolHandler`

### Execute Logic
1. Validate `path` is provided and is a string
2. Call `assertNotProtected(path)` from `./protected.ts` - throws if protected
3. Use `app.vault.getFileByPath(path)` to check if file exists
4. If file doesn't exist, return clear error: `Error: File not found: "${path}"`
5. Use `app.vault.read(file)` to get content
6. Split content into lines
7. Apply line range filtering if `start_line` and/or `end_line` provided
   - Lines are 1-indexed for user-friendliness
   - Default `start_line` to 1 if not provided
   - Default `end_line` to last line if not provided
8. Apply truncation if content exceeds limit (~100KB or ~2000 lines as reasonable default)
   - If truncated, append message: `[... truncated, showing lines {start}-{end} of {total}]`
9. Format output with line numbers: `"{lineNum}: {lineContent}\n"`
10. Return formatted content

### Export
- Add `createReadFileTool` to `src/llm/tools/index.ts`
- Add to `createVaultTools()` array in `index.ts`

## Acceptance Criteria
- [ ] `read_file` reads file contents successfully
- [ ] `read_file` supports `start_line` and `end_line` parameters
- [ ] `read_file` returns content with line numbers
- [ ] `read_file` truncates large files with indication of truncation
- [ ] `read_file` returns clear error for non-existent files
- [ ] `read_file` blocks access to protected folders (via `assertNotProtected`)
- [ ] Tool is exported from `index.ts` and included in `createVaultTools()`

## Files to Create/Modify
- Create: `src/llm/tools/readFile.ts`
- Modify: `src/llm/tools/index.ts` (add import and export)