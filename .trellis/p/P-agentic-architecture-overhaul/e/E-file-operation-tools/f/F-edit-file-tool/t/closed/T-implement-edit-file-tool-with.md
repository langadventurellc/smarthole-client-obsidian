---
id: T-implement-edit-file-tool-with
title: Implement edit_file tool with search/replace operations
status: done
priority: high
parent: F-edit-file-tool
prerequisites: []
affectedFiles:
  src/llm/tools/editFile.ts: Created new edit_file tool with search/replace
    functionality, supporting first occurrence or all occurrences replacement,
    protected path validation, and atomic file operations
  src/llm/tools/index.ts: Added import and export for createEditFileTool, added to
    createVaultTools array
log:
  - >-
    ## Research Completed


    ### Files Reviewed:

    - `/Users/zach/code/smarthole-client-obsidian/src/llm/tools/readFile.ts` -
    Pattern for file reading, protected path handling

    - `/Users/zach/code/smarthole-client-obsidian/src/llm/tools/modifyNote.ts` -
    Pattern for vault.process() atomic operations

    - `/Users/zach/code/smarthole-client-obsidian/src/llm/tools/protected.ts` -
    assertNotProtected() function

    - `/Users/zach/code/smarthole-client-obsidian/src/llm/tools/index.ts` -
    Export pattern

    - `/Users/zach/code/smarthole-client-obsidian/src/llm/LLMService.ts` -
    ToolHandler interface

    - `/Users/zach/code/smarthole-client-obsidian/src/llm/types.ts` - Tool type
    definition


    ### Implementation Plan:

    1. Create
    `/Users/zach/code/smarthole-client-obsidian/src/llm/tools/editFile.ts`

    2. Implement `createEditFileTool(app: App): ToolHandler` factory function

    3. Define tool with inputSchema: path (required), old_text (required),
    new_text (required), replace_all (optional boolean)

    4. Implement search/replace logic:
       - Default: replace first occurrence
       - With replace_all: true - replace all occurrences
    5. Error handling:
       - assertNotProtected() check first
       - File not found: `Error: File not found: "path"`
       - Text not found: `Text 'old_text' not found in file.md`
    6. Success response: `Replaced N occurrence(s)` with singular/plural

    7. Update index.ts to export the new tool


    ### Key Patterns to Follow:

    - Return error strings starting with "Error:" (not throw)

    - Use vault.process() for atomic read-modify-write

    - Use vault.getFileByPath() to check file existence

    - Wrap assertNotProtected in try/catch to convert to error string
  - >-
    Implemented the `edit_file` tool in `src/llm/tools/editFile.ts` with
    search/replace functionality.


    ## Features Implemented:

    1. **Search/Replace Operations**: Replaces first occurrence of `old_text`
    with `new_text` by default

    2. **Replace All**: Replaces all occurrences when `replace_all: true` flag
    is set

    3. **Clear Error Messages**: Returns descriptive errors for missing text,
    non-existent files, and protected paths

    4. **Change Summary**: Returns count of replacements made (e.g., "Replaced 1
    occurrence" or "Replaced 3 occurrences")

    5. **Protected Path Blocking**: Uses `assertNotProtected()` to prevent edits
    to `.obsidian/` and `.smarthole/` directories

    6. **Atomic Operations**: Uses `app.vault.process()` for atomic
    read-modify-write to prevent data loss


    ## Acceptance Criteria Met:

    - [x] `edit_file` replaces first occurrence of `old_text` with `new_text`

    - [x] `edit_file` replaces all occurrences when `replace_all: true`

    - [x] `edit_file` returns clear error when `old_text` not found

    - [x] `edit_file` returns summary of changes made

    - [x] `edit_file` blocks edits to protected folders

    - [x] `edit_file` errors on non-existent files


    ## Quality Checks Passed:

    - Prettier formatting: Passed

    - ESLint: Passed

    - TypeScript type-check: Passed

    - Build: Succeeded
schema: v1.0
childrenIds: []
created: 2026-02-04T02:26:04.226Z
updated: 2026-02-04T02:26:04.226Z
---

Create the `edit_file` tool in `src/llm/tools/editFile.ts` with search/replace functionality.

## Implementation Details

Create a new tool file following the existing pattern (readFile.ts, modifyNote.ts):
- Factory function `createEditFileTool(app: App): ToolHandler`
- Tool definition with `name: "edit_file"` and appropriate inputSchema
- Support for `path`, `old_text`, `new_text`, and optional `replace_all` parameters

### Search/Replace Behavior
- Replace first occurrence of `old_text` with `new_text` by default
- Replace all occurrences when `replace_all: true`
- Return clear error when `old_text` not found: `"Text 'foo' not found in file.md"`
- Return summary of changes: `"Replaced 1 occurrence"` or `"Replaced 3 occurrences"`

### Error Handling
- Call `assertNotProtected(path)` before any operations
- Return error for non-existent files: `"Error: File not found: \"path/to/file.md\""`
- Validate required parameters (path, old_text, new_text)

### Technical Requirements
- Use `app.vault.process()` for atomic read-modify-write
- Follow existing tool patterns for input validation and error return format
- Do NOT add line-based operations in this task (separate task)

## Acceptance Criteria
- [ ] `edit_file` replaces first occurrence of `old_text` with `new_text`
- [ ] `edit_file` replaces all occurrences when `replace_all: true`
- [ ] `edit_file` returns clear error when `old_text` not found
- [ ] `edit_file` returns summary of changes made
- [ ] `edit_file` blocks edits to protected folders
- [ ] `edit_file` errors on non-existent files