---
id: F-remove-old-mvp-tools
title: Remove Old MVP Tools
status: done
priority: medium
parent: E-tool-migration-and-cleanup
prerequisites: []
affectedFiles:
  src/llm/tools/index.ts: Removed imports for createCreateNoteTool,
    createModifyNoteTool, createSearchNotesTool, createOrganizeNoteTool; removed
    them from createVaultTools() array; removed their re-export statements
  src/llm/index.ts: Removed re-exports for createCreateNoteTool,
    createModifyNoteTool, createSearchNotesTool, createOrganizeNoteTool from the
    Vault Tools section
  src/llm/tools/createNote.ts: DELETED - old MVP tool for creating notes
  src/llm/tools/modifyNote.ts: DELETED - old MVP tool for modifying notes
  src/llm/tools/searchNotes.ts: DELETED - old MVP tool for searching notes
  src/llm/tools/organizeNotes.ts: DELETED - old MVP tool for organizing notes
log:
  - "Auto-completed: All child tasks are complete"
schema: v1.0
childrenIds:
  - T-remove-old-mvp-tools-from
created: 2026-02-04T06:44:28.506Z
updated: 2026-02-04T06:44:28.506Z
---

# Remove Old MVP Tools

## Purpose

Remove the old MVP tools from the codebase and update the tools index to only export the new agentic tools. This is a pure code deletion and cleanup task.

## Current State

**Old tools to remove:**
- `src/llm/tools/createNote.ts`
- `src/llm/tools/modifyNote.ts`
- `src/llm/tools/searchNotes.ts`
- `src/llm/tools/organizeNotes.ts`

**Current index.ts exports both old and new tools:**
- Imports old tool factory functions
- Includes old tools in `createVaultTools()` array
- Re-exports old tool factory functions

**MessageProcessor** already correctly uses `createVaultTools()` and `createSendMessageTool()` - no changes needed there.

## Key Components

### 1. Update `src/llm/tools/index.ts`
- Remove imports for: `createCreateNoteTool`, `createModifyNoteTool`, `createSearchNotesTool`, `createOrganizeNoteTool`
- Remove old tools from `createVaultTools()` return array
- Remove re-exports for old tool factory functions
- Keep all new tool exports intact (readFile, editFile, writeFile, createFolder, deleteFile, moveFile, searchFiles, listFiles, getFileInfo, sendMessage)

### 2. Delete Old Tool Files
- Delete `src/llm/tools/createNote.ts`
- Delete `src/llm/tools/modifyNote.ts`
- Delete `src/llm/tools/searchNotes.ts`
- Delete `src/llm/tools/organizeNotes.ts`

## Acceptance Criteria

- [ ] `index.ts` no longer imports old tool factory functions
- [ ] `createVaultTools()` returns only new tools (readFile, editFile, writeFile, createFolder, deleteFile, moveFile, searchFiles, listFiles, getFileInfo)
- [ ] Old tool factory re-exports removed from index.ts
- [ ] Four old tool files deleted from `src/llm/tools/`
- [ ] No TypeScript compilation errors (`mise run type-check` passes)
- [ ] No lint errors (`mise run quality` passes)

## Implementation Guidance

1. First update `index.ts` to remove all references to old tools
2. Then delete the four old tool files
3. Run `mise run quality` to verify no errors

## Testing Requirements

- Run `mise run type-check` to verify TypeScript compilation
- Run `mise run quality` to verify lint and format pass
- Manual verification: Load plugin in Obsidian and verify it initializes without errors

## Files to Modify

- `src/llm/tools/index.ts` - Remove old tool imports, exports, and array entries

## Files to Delete

- `src/llm/tools/createNote.ts`
- `src/llm/tools/modifyNote.ts`
- `src/llm/tools/searchNotes.ts`
- `src/llm/tools/organizeNotes.ts`