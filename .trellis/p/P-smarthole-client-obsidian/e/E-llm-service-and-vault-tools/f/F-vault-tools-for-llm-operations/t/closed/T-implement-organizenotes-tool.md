---
id: T-implement-organizenotes-tool
title: Implement organizeNotes tool and tool registry
status: done
priority: high
parent: F-vault-tools-for-llm-operations
prerequisites:
  - T-implement-createnote-and
  - T-implement-searchnotes-tool
affectedFiles:
  src/llm/tools/organizeNotes.ts: Created factory function
    createOrganizeNoteTool(app) that returns a ToolHandler for the organize_note
    tool. Supports renaming and moving notes with automatic destination folder
    creation, conflict detection, and path normalization.
  src/llm/tools/index.ts: Added createVaultTools(app) function that returns an
    array of all instantiated vault tools for bulk registration. Added export
    for createOrganizeNoteTool.
  src/llm/index.ts: Added exports for createVaultTools and createOrganizeNoteTool
    from the tools module.
log:
  - >-
    Research completed. Identified patterns from existing tools (createNote.ts,
    modifyNote.ts, searchNotes.ts):

    - Factory function pattern: createXxxTool(app: App): ToolHandler

    - Tool definition with name, description, inputSchema

    - Execute function returns Promise<string> with error prefix for failures

    - Path normalization helper for .md extension

    - ensureParentFolder helper can be adapted for destination folder creation


    Starting implementation of organizeNotes.ts following established patterns.
  - >-
    Implemented the organizeNotes tool and tool registry for the LLM vault tools
    feature.


    The organize_note tool enables renaming and moving notes within the vault
    using `vault.rename()`. It includes:

    - Input validation for path and new_path parameters

    - Path normalization to ensure .md extension

    - Conflict detection (prevents overwriting existing files)

    - Automatic destination folder creation using `vault.createFolder()`

    - Clear error messages for missing source files and path conflicts


    The tool registry (`createVaultTools` function) was added to provide a
    convenient way to instantiate all vault tools at once for bulk registration
    with LLMService.


    All quality checks (lint, format, type-check) pass and the build compiles
    successfully.
schema: v1.0
childrenIds: []
created: 2026-02-03T06:50:42.034Z
updated: 2026-02-03T06:50:42.034Z
---

# Implement organizeNotes tool and tool registry

## Overview
Implement the organize tool for renaming/moving notes and create the tool registry that exports all vault tools for registration.

## Files to Create

### src/llm/tools/organizeNotes.ts
- Export a `ToolHandler` compatible with `LLMService.registerTool()`
- Tool name: `organize_note`
- Parameters:
  - `path` (required string): Current path of the note
  - `new_path` (required string): New path (rename) or new location (move)
- Functionality:
  - Rename notes using `vault.rename(file, newPath)`
  - Move notes between folders (same operation - rename to new path)
  - Handle conflicts when target already exists
  - Create destination folder if needed using `vault.createFolder()`
  - Return old and new paths as confirmation

### src/llm/tools/index.ts
- Export all tools as array for bulk registration
- Export individual tools for selective registration
- Consistent pattern:
```typescript
import { createNoteToolHandler } from './createNote';
import { modifyNoteToolHandler } from './modifyNote';
import { searchNotesToolHandler } from './searchNotes';
import { organizeNoteToolHandler } from './organizeNotes';

export const vaultTools = [
  createNoteToolHandler,
  modifyNoteToolHandler,
  searchNotesToolHandler,
  organizeNoteToolHandler,
];

// Also export individuals for selective use
export { createNoteToolHandler } from './createNote';
export { modifyNoteToolHandler } from './modifyNote';
export { searchNotesToolHandler } from './searchNotes';
export { organizeNoteToolHandler } from './organizeNotes';
```

## Technical Context

The `ToolHandler` interface from `src/llm/LLMService.ts:26-31`:
```typescript
export interface ToolHandler {
  definition: Tool;
  execute: (input: Record<string, unknown>) => Promise<string>;
}
```

Rename/move pattern from feature spec:
```typescript
await vault.rename(file, newPath);
```

## Acceptance Criteria
- organizeNotes renames notes correctly
- organizeNotes moves notes between folders  
- organizeNotes handles existing file conflicts with clear error
- organizeNotes creates destination folder if needed
- Tool registry exports all tools as array
- Tool registry exports individual tools for selective use
- All exports are properly typed