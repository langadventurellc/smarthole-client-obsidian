---
id: F-update-tool-documentation
title: Update Tool Documentation
status: open
priority: medium
parent: E-tool-migration-and-cleanup
prerequisites:
  - F-remove-old-mvp-tools
affectedFiles: {}
log: []
schema: v1.0
childrenIds: []
created: 2026-02-04T06:44:43.901Z
updated: 2026-02-04T06:44:43.901Z
---

# Update Tool Documentation

## Purpose

Update all documentation to remove references to the old MVP tools and ensure documentation accurately reflects the current tool set.

## Current State

**Documentation files referencing old tools:**

1. **`docs/vault-tools.md`** - Documents all tools including:
   - `create_note` tool (lines 32-64)
   - `modify_note` tool (lines 66-101)
   - `search_notes` tool (lines 103-148)
   - `organize_note` tool (lines 413-444)
   - Available Tools table includes old tools
   - Implementation section lists old tool files

2. **`docs/llm-service.md`** - Contains example:
   - Line 67: `const tools = service.getRegisteredTools(); // ["create_note", "search_notes", ...]`

3. **`CLAUDE.md`** - Project structure section lists:
   - `tools/` description mentions: "vault: createNote, modifyNote, searchNotes, ..."

## Key Components

### 1. Update `docs/vault-tools.md`
- Remove "Available Tools" table entries for: create_note, modify_note, search_notes, organize_note
- Remove full documentation sections for these four tools
- Remove references to old tools from "Implementation" section at the bottom
- Keep the comparison table in search_files section but update any references

### 2. Update `docs/llm-service.md`
- Update the example tool list comment to show new tools instead of old ones
- Example: `// ["read_file", "edit_file", "write_file", ...]`

### 3. Update `CLAUDE.md`
- Update Project Structure `tools/` description to reflect current tools
- Remove: createNote, modifyNote, searchNotes, organizeNotes
- Ensure new tools are listed: readFile, editFile, writeFile, createFolder, deleteFile, moveFile, searchFiles, listFiles, getFileInfo, sendMessage

## Acceptance Criteria

- [ ] `docs/vault-tools.md` contains no documentation for create_note, modify_note, search_notes, organize_note
- [ ] `docs/vault-tools.md` Available Tools table only lists current tools
- [ ] `docs/vault-tools.md` Implementation section only references current tool files
- [ ] `docs/llm-service.md` example shows new tool names
- [ ] `CLAUDE.md` project structure accurately reflects current tools
- [ ] No broken internal document references
- [ ] Documentation is accurate and consistent

## Implementation Guidance

1. Start with `docs/vault-tools.md` as it has the most changes
2. Remove entire sections for old tools rather than trying to update them
3. Update the Available Tools table at the top
4. Update the Implementation section at the bottom
5. Then update `docs/llm-service.md` example
6. Finally update `CLAUDE.md` project structure

## Testing Requirements

- Review each file to ensure all old tool references are removed
- Verify document links still work (no broken references)
- Run `mise run quality` to ensure any markdown linting passes

## Files to Modify

- `docs/vault-tools.md`
- `docs/llm-service.md`
- `CLAUDE.md`