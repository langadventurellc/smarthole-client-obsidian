---
id: T-add-line-based-operations-to
title: Add line-based operations to edit_file tool
status: open
priority: high
parent: F-edit-file-tool
prerequisites:
  - T-implement-edit-file-tool-with
affectedFiles: {}
log: []
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