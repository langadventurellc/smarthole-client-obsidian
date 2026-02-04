---
id: E-file-operation-tools
title: File Operation Tools
status: in-progress
priority: high
parent: P-agentic-architecture-overhaul
prerequisites: []
affectedFiles:
  src/llm/tools/protected.ts: Created new protected path utility with
    isProtectedPath(), assertNotProtected(), and internal normalizePath()
    functions
  src/llm/tools/readFile.ts: Created new read_file tool with path validation,
    protected path checking, line number formatting, optional line range
    filtering, and smart truncation for large files
  src/llm/tools/index.ts: Added import and export for createReadFileTool, added to
    createVaultTools() array; Added import and export for createEditFileTool,
    added to createVaultTools array; Added import and export for
    createEditFileTool, added to createVaultTools array (completed in
    T-implement-edit-file-tool-with)
  src/llm/tools/editFile.ts: "Created new edit_file tool with search/replace
    functionality, supporting first occurrence or all occurrences replacement,
    protected path validation, and atomic file operations; Extended edit_file
    tool with line-based operations: insert_after_line, insert_before_line,
    delete_lines parameters. Added determineOperationMode(),
    executeSearchReplace(), executeLineBased(), executeInsertAfterLine(),
    executeInsertBeforeLine(), and executeDeleteLines() functions. Updated tool
    description and inputSchema to document new parameters."
log: []
schema: v1.0
childrenIds:
  - F-create-folder-tool
  - F-delete-tool
  - F-edit-file-tool
  - F-move-tool
  - F-read-file-tool
  - F-write-file-tool
created: 2026-02-04T01:57:36.976Z
updated: 2026-02-04T01:57:36.976Z
---

# File Operation Tools

## Purpose and Goals

Implement the core file manipulation tools that replace the MVP tools (createNote, modifyNote, organizeNotes) with purpose-built tools designed for LLM agent use. These tools provide predictable output formats, clear error handling, and context-window-friendly responses.

## Major Components and Deliverables

### 1. Protected Folder Check (`src/llm/tools/protected.ts`)
Shared utility for all tools to enforce access restrictions on `.obsidian/` and `.smarthole/` directories.

### 2. Read File Tool (`src/llm/tools/readFile.ts`)
- Read file contents with optional line range (start_line, end_line)
- Return line numbers with content
- Handle large files with smart truncation (configurable limit)
- Clear error for non-existent files

### 3. Write File Tool (`src/llm/tools/writeFile.ts`)
- Create new files
- Overwrite existing files
- Auto-create parent directories
- Return confirmation with file path and size

### 4. Edit File Tool (`src/llm/tools/editFile.ts`)
- Search/replace operations
- Line-based insertions
- Handle "not found" cases with clear error
- Return diff or summary of changes made

### 5. Move Tool (`src/llm/tools/move.ts`)
- Rename files
- Move files to different folders
- Works for folders too
- Auto-create destination parent directories
- Clear error if source doesn't exist

### 6. Delete Tool (`src/llm/tools/delete.ts`)
- Soft delete to Obsidian trash using `app.vault.trash()`
- Respects user's trash settings
- Return confirmation of what was deleted
- Clear error if file doesn't exist

### 7. Create Folder Tool (`src/llm/tools/createFolder.ts`)
- Create single folder
- Create parent directories if needed
- Return confirmation or note if already exists

## Acceptance Criteria

### Protected Folders
- [ ] Operations on `.obsidian/` are blocked with clear error
- [ ] Operations on `.smarthole/` are blocked with clear error
- [ ] Protection applies to all file/folder tools in this epic

### File Reading
- [ ] `read_file` reads file contents
- [ ] Supports optional `start_line` and `end_line` parameters
- [ ] Returns line numbers with content
- [ ] Handles large files with smart truncation (configurable limit)
- [ ] Clear error for non-existent files

### File Writing
- [ ] `write_file` creates new files
- [ ] `write_file` overwrites existing files
- [ ] Auto-creates parent directories
- [ ] Returns confirmation with file path and size

### File Editing
- [ ] `edit_file` supports search/replace operations
- [ ] `edit_file` supports line-based insertions
- [ ] Handles "not found" cases with clear error
- [ ] Returns diff or summary of changes made

### Move/Rename
- [ ] `move` renames files
- [ ] `move` moves files to different folders
- [ ] `move` works for folders too
- [ ] Auto-creates destination parent directories
- [ ] Clear error if source doesn't exist

### Delete
- [ ] `delete` soft deletes to Obsidian trash
- [ ] Uses `app.vault.trash()` API (respects user settings)
- [ ] Returns confirmation of what was deleted
- [ ] Clear error if file doesn't exist

### Create Folder
- [ ] `create_folder` creates single folder
- [ ] Creates parent directories if needed
- [ ] Returns confirmation or note if already exists

## Technical Considerations

- Follow existing tool pattern: factory function returning `ToolHandler` with `definition` and `execute`
- Use `app.vault` APIs for all file operations
- Paths should be relative to vault root
- All tools must call `assertNotProtected()` before any operation
- Error messages should be clear and actionable for LLM consumption
- Output should be sized appropriately for context windows

## Dependencies

None - this epic can be developed independently.

## User Stories

- As an agent, I can read any note in the vault to understand its contents
- As an agent, I can create new notes with automatic folder creation
- As an agent, I can make targeted edits to existing notes without rewriting entire files
- As an agent, I can reorganize the vault by moving and renaming files
- As an agent, I can safely delete files knowing they go to trash for recovery

## Estimated Scale

5-7 features (one per tool, protected utility may be a task within read_file feature)