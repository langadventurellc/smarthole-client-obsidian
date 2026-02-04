---
id: T-add-line-based-operations-to
title: Add line-based operations to edit_file tool
status: done
priority: high
parent: F-edit-file-tool
prerequisites:
  - T-implement-edit-file-tool-with
affectedFiles:
  src/llm/tools/editFile.ts: "Extended edit_file tool with line-based operations:
    insert_after_line, insert_before_line, delete_lines parameters. Added
    determineOperationMode(), executeSearchReplace(), executeLineBased(),
    executeInsertAfterLine(), executeInsertBeforeLine(), and
    executeDeleteLines() functions. Updated tool description and inputSchema to
    document new parameters."
log:
  - >-
    ## Research Completed


    ### Files Reviewed:

    - `/Users/zach/code/smarthole-client-obsidian/src/llm/tools/editFile.ts` -
    Current edit_file implementation with search/replace

    - `/Users/zach/code/smarthole-client-obsidian/src/llm/tools/index.ts` - Tool
    exports

    - `/Users/zach/code/smarthole-client-obsidian/src/llm/tools/readFile.ts` -
    Reference for line-based operations (1-indexed lines)

    - `/Users/zach/code/smarthole-client-obsidian/src/llm/tools/modifyNote.ts` -
    Reference for atomic vault.process() pattern

    - `/Users/zach/code/smarthole-client-obsidian/src/llm/types.ts` -
    Tool/ToolHandler interface definitions


    ### Implementation Plan:


    1. **Update tool description** to mention both search/replace and line-based
    operations


    2. **Update inputSchema** to add new parameters:
       - `insert_after_line` (integer): Line number after which to insert content
       - `insert_before_line` (integer): Line number before which to insert content
       - `delete_lines` (object with start/end): Line range for deletion
       - `content` (string): Content to insert (for insert operations)

    3. **Add validation logic** to ensure mutual exclusivity:
       - Search/replace mode: requires `old_text` and `new_text`
       - Line-based mode: requires one of `insert_after_line`, `insert_before_line`, or `delete_lines`
       - Error if both modes specified simultaneously

    4. **Implement line-based operations**:
       - `insert_after_line`: Split content into lines, insert after specified line
       - `insert_before_line`: Split content into lines, insert before specified line
       - `delete_lines`: Remove lines from start to end (inclusive)

    5. **Implement error handling**:
       - Line out of range: "Error: Line 100 does not exist in file with 50 lines"
       - Missing content for insert: "Error: content is required for insert operations"
       - Invalid delete range: "Error: delete_lines.end must be >= delete_lines.start"

    6. **Return messages**:
       - Insert: "Inserted 5 lines after line 42" or "Inserted 3 lines before line 10"
       - Delete: "Deleted lines 5-10 (6 lines)"

    ### Key Patterns to Follow:

    - Return error strings starting with "Error:" (not throw)

    - Use vault.process() for atomic operations

    - Line numbers are 1-indexed (consistent with readFile.ts)

    - All parameters are optional in schema; validation in execute function
  - >-
    ## Implementation Completed


    Extended the `edit_file` tool with line-based operations as an alternative
    to search/replace.


    ### Features Implemented:


    1. **New Parameters Added:**
       - `insert_after_line` (integer): Line number after which to insert content (1-indexed, 0 allowed for inserting at the very beginning)
       - `insert_before_line` (integer): Line number before which to insert content (1-indexed)
       - `delete_lines` (object): `{ start: number, end: number }` for line range deletion (1-indexed, inclusive)
       - `content` (string): Content to insert for insert operations

    2. **Operation Mode Detection:**
       - `determineOperationMode()` function detects if search/replace or line-based parameters are provided
       - Returns error if both modes are mixed in a single call

    3. **Line-Based Operations:**
       - `executeInsertAfterLine()`: Inserts content after the specified line
       - `executeInsertBeforeLine()`: Inserts content before the specified line
       - `executeDeleteLines()`: Deletes lines from start to end (inclusive)

    4. **Validation and Error Handling:**
       - Line out of range: "Error: Line 100 does not exist in file with 50 lines"
       - Missing content for insert: "Error: content is required for insert operations"
       - Invalid delete range: "Error: delete_lines.end must be >= delete_lines.start"
       - Mixed operations: "Error: Cannot mix search/replace parameters with line-based parameters"

    5. **Success Messages:**
       - Insert: "Inserted 5 lines after line 42" or "Inserted 3 lines before line 10"
       - Delete: "Deleted lines 5-10 (6 lines)"

    ### Acceptance Criteria Met:

    - [x] `edit_file` inserts text after specified line number

    - [x] `edit_file` inserts text before specified line number

    - [x] `edit_file` deletes specified line range

    - [x] Operations are mutually exclusive (error if mixing search/replace with
    line-based)

    - [x] Line numbers are 1-indexed

    - [x] Clear error messages for out-of-range line numbers


    ### Quality Checks Passed:

    - Prettier formatting: Passed

    - ESLint: Passed

    - TypeScript type-check: Passed

    - Build: Succeeded
  - Extended the `edit_file` tool to support line-based operations as an
    alternative to search/replace. Added `insert_after_line`,
    `insert_before_line`, `delete_lines`, and `content` parameters. Implemented
    mutual exclusivity between search/replace and line-based modes, 1-indexed
    line numbers, comprehensive validation, and clear error messages for
    out-of-range operations.
schema: v1.0
childrenIds: []
created: 2026-02-04T02:26:11.798Z
updated: 2026-02-04T02:26:11.798Z
---

Extend the `edit_file` tool to support line-based operations as an alternative to search/replace.

## Implementation Details

Add line-based operation parameters to the existing edit_file tool:
- `insert_after_line` (integer): Line number after which to insert content
- `insert_before_line` (integer): Line number before which to insert content  
- `delete_lines` (object): `{ start: number, end: number }` for line range deletion
- `content` (string): Content to insert (for insert operations)

### Operation Rules
- Operations are mutually exclusive: either search/replace OR line-based, not both
- Line numbers are 1-indexed
- Return error if multiple operation types specified in same call
- Return error if line number is out of range

### Line Operation Behavior
- `insert_after_line`: Insert `content` after specified line number
- `insert_before_line`: Insert `content` before specified line number
- `delete_lines`: Delete lines from `start` to `end` (inclusive)

### Return Messages
- Insert: `"Inserted 5 lines after line 42"` or `"Inserted 3 lines before line 10"`
- Delete: `"Deleted lines 5-10 (6 lines)"`

### Error Cases
- Line number out of range: `"Error: Line 100 does not exist in file with 50 lines"`
- Missing content for insert: `"Error: content is required for insert operations"`
- Invalid delete range: `"Error: delete_lines.end must be >= delete_lines.start"`

## Acceptance Criteria
- [ ] `edit_file` inserts text after specified line number
- [ ] `edit_file` inserts text before specified line number
- [ ] `edit_file` deletes specified line range
- [ ] Operations are mutually exclusive (error if mixing search/replace with line-based)
- [ ] Line numbers are 1-indexed
- [ ] Clear error messages for out-of-range line numbers