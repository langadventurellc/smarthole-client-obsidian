---
id: F-edit-file-tool
title: Edit File Tool
status: open
priority: high
parent: E-file-operation-tools
prerequisites:
  - F-read-file-tool
affectedFiles: {}
log: []
schema: v1.0
childrenIds: []
created: 2026-02-04T02:03:57.093Z
updated: 2026-02-04T02:03:57.093Z
---

Implement the `edit_file` tool for making targeted edits to files without rewriting entire content.

## Scope

### Edit File Tool (src/llm/tools/editFile.ts)
- Support search/replace operations with `old_text` and `new_text` parameters
- Support optional `replace_all` flag (default: replace first occurrence only)
- Support line-based operations: `insert_after_line`, `insert_before_line`, `delete_lines`
- Handle "text not found" cases with clear error message
- Return summary of changes made (e.g., "Replaced 3 occurrences" or "Inserted 5 lines after line 42")
- Call `assertNotProtected()` before editing
- Follow existing tool pattern: factory function returning `ToolHandler`

## Acceptance Criteria
- [ ] `edit_file` replaces first occurrence of `old_text` with `new_text`
- [ ] `edit_file` replaces all occurrences when `replace_all: true`
- [ ] `edit_file` inserts text after specified line number
- [ ] `edit_file` inserts text before specified line number
- [ ] `edit_file` deletes specified line range
- [ ] `edit_file` returns clear error when `old_text` not found
- [ ] `edit_file` returns summary of changes made
- [ ] `edit_file` blocks edits to protected folders
- [ ] `edit_file` errors on non-existent files

## Technical Notes
- Use `app.vault.process()` for atomic read-modify-write
- Operations are mutually exclusive: either search/replace OR line-based, not both in one call
- Line numbers are 1-indexed
- Return helpful context in error messages (e.g., "Text 'foo' not found in file.md")