---
id: F-vault-tools-for-llm-operations
title: Vault Tools for LLM Operations
status: done
priority: high
parent: E-llm-service-and-vault-tools
prerequisites:
  - F-llm-service-layer-with
affectedFiles:
  src/llm/tools/createNote.ts: Created factory function createCreateNoteTool(app)
    that returns a ToolHandler for the create_note tool. Supports optional path
    parameter with auto-filename generation from H1 headings or content,
    automatic parent folder creation, and validation to prevent overwriting
    existing files.
  src/llm/tools/modifyNote.ts: Created factory function createModifyNoteTool(app)
    that returns a ToolHandler for the modify_note tool. Supports
    append/prepend/replace operations with atomic vault.process() for safe
    concurrent access, proper newline handling, and clear error messages for
    missing files.
  src/llm/tools/index.ts: Created barrel export file for the tools module,
    exporting both createCreateNoteTool and createModifyNoteTool factory
    functions.; Added export for createSearchNotesTool from the tools module.;
    Added createVaultTools(app) function that returns an array of all
    instantiated vault tools for bulk registration. Added export for
    createOrganizeNoteTool.
  src/llm/index.ts: Updated to export the new vault tools (createCreateNoteTool,
    createModifyNoteTool) from the tools submodule.; Added createSearchNotesTool
    to the Vault Tools exports.; Added exports for createVaultTools and
    createOrganizeNoteTool from the tools module.
  src/llm/tools/searchNotes.ts: Created factory function
    createSearchNotesTool(app) that returns a ToolHandler for the search_notes
    tool. Uses prepareSimpleSearch() for efficient plain text search, returns up
    to 10 results with excerpts showing match context, supports optional
    read_content parameter for full file content.
  src/llm/tools/organizeNotes.ts: Created factory function
    createOrganizeNoteTool(app) that returns a ToolHandler for the organize_note
    tool. Supports renaming and moving notes with automatic destination folder
    creation, conflict detection, and path normalization.
log:
  - "Auto-completed: All child tasks are complete"
schema: v1.0
childrenIds:
  - T-implement-createnote-and
  - T-implement-organizenotes-tool
  - T-implement-searchnotes-tool
created: 2026-02-03T06:20:22.210Z
updated: 2026-02-03T06:20:22.210Z
---

# Vault Tools for LLM Operations

## Purpose

Implement the vault manipulation tools that the LLM uses to manage notes. These tools allow Claude to create, modify, search, and organize notes based on user commands routed through SmartHole.

## Requirements

### Create Note Tool
- File: `src/llm/tools/createNote.ts`
- Create new markdown files at specified paths
- Auto-generate filenames from content if not specified (e.g., first heading or summary)
- Create parent folders if they don't exist using `vault.createFolder()`
- Use `vault.create()` for file creation
- Return created file path and confirmation
- Tool definition with clear parameter schema for Claude

### Modify Note Tool
- File: `src/llm/tools/modifyNote.ts`
- Operations: append content, prepend content, replace content
- Use `vault.process()` for atomic read-modify-write operations
- Handle file not found gracefully with clear error message
- Support finding notes by path or by search
- Return modified file path and summary of changes

### Search Notes Tool
- File: `src/llm/tools/searchNotes.ts`
- Use `prepareSimpleSearch()` from Obsidian API (not fuzzy search)
- Search all markdown files in vault
- Return matching file paths with relevant excerpts
- Include content snippets around matches for context
- Limit results (max 10) to prevent context overflow
- Optionally read full content of specific files

### Organize Notes Tool
- File: `src/llm/tools/organizeNotes.ts`
- Rename notes using `vault.rename()`
- Move notes between folders
- Handle conflicts when target already exists
- Create destination folder if needed
- Return old and new paths as confirmation

### Tool Registry
- File: `src/llm/tools/index.ts`
- Export all tools as array for registration
- Each tool exports both execution function and Claude tool definition
- Consistent error handling pattern across all tools

## Acceptance Criteria

- [ ] createNote tool creates files at specified paths
- [ ] createNote auto-generates sensible filenames when not provided
- [ ] createNote creates parent folders automatically
- [ ] modifyNote appends content to existing notes
- [ ] modifyNote replaces content in existing notes
- [ ] modifyNote uses atomic operations (vault.process)
- [ ] modifyNote handles missing files with clear error
- [ ] searchNotes finds notes matching query
- [ ] searchNotes returns excerpts with match context
- [ ] searchNotes limits results to 10 maximum
- [ ] organizeNotes renames notes correctly
- [ ] organizeNotes moves notes between folders
- [ ] organizeNotes handles existing file conflicts
- [ ] All tools have proper Claude tool definitions
- [ ] Tool errors are returned in format LLM can understand

## Technical Notes

### Vault API Usage
```typescript
// Create with folder creation
const folderPath = path.substring(0, path.lastIndexOf('/'));
if (folderPath && !vault.getFolderByPath(folderPath)) {
  await vault.createFolder(folderPath);
}
await vault.create(path, content);

// Atomic modification
await vault.process(file, (data) => {
  return data + '\n' + newContent; // append
});

// Search
const search = prepareSimpleSearch(query);
for (const file of vault.getMarkdownFiles()) {
  const content = await vault.cachedRead(file);
  if (search(content)) { /* match */ }
}

// Rename/move
await vault.rename(file, newPath);
```

### Tool Definition Format
Each tool needs a definition object for Claude:
```typescript
{
  name: 'create_note',
  description: 'Create a new note in the vault',
  input_schema: {
    type: 'object',
    properties: {
      path: { type: 'string', description: '...' },
      content: { type: 'string', description: '...' }
    },
    required: ['content']
  }
}
```

## File Structure

```
src/llm/tools/
├── createNote.ts    # Create note tool
├── modifyNote.ts    # Modify note tool  
├── searchNotes.ts   # Search notes tool
├── organizeNotes.ts # Organize notes tool
└── index.ts         # Tool registry and exports
```

## Dependencies

- **F-llm-service-layer-with**: Requires tool interface definitions from LLM types