---
id: T-implement-createnote-and
title: Implement createNote and modifyNote tools
status: done
priority: high
parent: F-vault-tools-for-llm-operations
prerequisites: []
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
    functions.
  src/llm/index.ts: Updated to export the new vault tools (createCreateNoteTool,
    createModifyNoteTool) from the tools submodule.
log:
  - Implemented createNote and modifyNote tools for the LLM service layer. Both
    tools follow the ToolHandler interface pattern and use factory functions
    that take the Obsidian App instance for vault access. The createNote tool
    supports auto-generating filenames from content (using first H1 heading or
    first 50 characters) and creates parent folders automatically. The
    modifyNote tool supports append, prepend, and replace operations using
    atomic vault.process() for data safety. Both tools include proper input
    validation and clear error messages to guide the LLM.
schema: v1.0
childrenIds: []
created: 2026-02-03T06:50:25.978Z
updated: 2026-02-03T06:50:25.978Z
---

# Implement createNote and modifyNote tools

## Overview
Implement the core note creation and modification tools that allow the LLM to create new notes and modify existing ones in the vault.

## Files to Create

### src/llm/tools/createNote.ts
- Export a `ToolHandler` compatible with `LLMService.registerTool()`
- Tool name: `create_note`
- Parameters:
  - `path` (optional string): Path where to create the note
  - `content` (required string): Content for the note
- Functionality:
  - Create new markdown files at specified paths
  - Auto-generate filenames from content if path not specified (use first heading or first line summary)
  - Create parent folders if they don't exist using `vault.createFolder()`
  - Use `vault.create()` for file creation
  - Return created file path and confirmation message

### src/llm/tools/modifyNote.ts
- Export a `ToolHandler` compatible with `LLMService.registerTool()`
- Tool name: `modify_note`
- Parameters:
  - `path` (required string): Path to the note to modify
  - `operation` (required string): One of "append", "prepend", "replace"
  - `content` (required string): Content to add/replace with
- Functionality:
  - Use `vault.process()` for atomic read-modify-write operations
  - Handle file not found gracefully with clear error message
  - Return modified file path and summary of changes

**Note on "finding notes by path or by search":** The feature spec mentions supporting finding notes by search. This is achieved through the LLM workflow: the LLM uses the searchNotes tool first to find the note, then passes the exact path to modifyNote. This keeps each tool single-purpose and simpler for AI agents to orchestrate. The modifyNote tool itself only accepts exact paths.

## Technical Context

The `ToolHandler` interface from `src/llm/LLMService.ts:26-31`:
```typescript
export interface ToolHandler {
  definition: Tool;
  execute: (input: Record<string, unknown>) => Promise<string>;
}
```

The `Tool` interface from `src/llm/types.ts:85-92`:
```typescript
export interface Tool {
  name: string;
  description: string;
  inputSchema: ToolInputSchema;
}
```

## Acceptance Criteria
- createNote tool creates files at specified paths
- createNote auto-generates sensible filenames when not provided  
- createNote creates parent folders automatically
- modifyNote appends content to existing notes
- modifyNote prepends content to existing notes
- modifyNote replaces content in existing notes
- modifyNote uses atomic operations (vault.process)
- modifyNote handles missing files with clear error
- Both tools have proper Claude tool definitions with clear parameter schemas