---
id: F-write-file-tool
title: Write File Tool
status: open
priority: high
parent: E-file-operation-tools
prerequisites:
  - F-read-file-tool
affectedFiles: {}
log: []
schema: v1.0
childrenIds: []
created: 2026-02-04T02:03:49.529Z
updated: 2026-02-04T02:03:49.529Z
---

Implement the `write_file` tool for creating and overwriting files in the vault.

## Scope

### Write File Tool (src/llm/tools/writeFile.ts)
- Create new files with specified content
- Overwrite existing files (unlike createNote which errors on existing files)
- Auto-create parent directories if they don't exist
- Return confirmation with file path and size (bytes/character count)
- Call `assertNotProtected()` before writing
- Follow existing tool pattern: factory function returning `ToolHandler`

## Acceptance Criteria
- [ ] `write_file` creates new files with provided content
- [ ] `write_file` overwrites existing files without error
- [ ] `write_file` auto-creates parent directories when needed
- [ ] `write_file` returns confirmation with file path and size
- [ ] `write_file` blocks writes to protected folders
- [ ] `write_file` handles empty content gracefully

## Technical Notes
- Use `app.vault.create()` for new files
- Use `app.vault.modify()` for existing files (or use `process()` for atomic operation)
- Reuse the `ensureParentFolder()` logic from createNote.ts
- Size should be reported in bytes for small files, KB for larger ones