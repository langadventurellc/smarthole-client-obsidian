---
id: T-remove-old-mvp-tools-from
title: Remove old MVP tools from index and delete files
status: done
priority: medium
parent: F-remove-old-mvp-tools
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
  - "Removed old MVP tools from the codebase: deleted createNote.ts,
    modifyNote.ts, searchNotes.ts, and organizeNotes.ts files; removed their
    imports, array entries, and re-exports from src/llm/tools/index.ts; removed
    their re-exports from src/llm/index.ts. All quality checks pass (type-check,
    lint, format)."
schema: v1.0
childrenIds: []
created: 2026-02-04T06:47:30.151Z
updated: 2026-02-04T06:47:30.151Z
---

# Remove Old MVP Tools from Index and Delete Files

## Context

The SmartHole client has migrated to new agentic tools (readFile, editFile, writeFile, etc.) but the old MVP tools (createNote, modifyNote, searchNotes, organizeNotes) still exist in the codebase. This task removes them.

**Parent Feature**: F-remove-old-mvp-tools

## Current State

`src/llm/tools/index.ts` currently:
- Imports old tool factory functions (lines 10-13)
- Includes old tools in `createVaultTools()` array (lines 32-35)
- Re-exports old tool factory functions (lines 49-52)

Old tool files exist:
- `src/llm/tools/createNote.ts`
- `src/llm/tools/modifyNote.ts`
- `src/llm/tools/searchNotes.ts`
- `src/llm/tools/organizeNotes.ts`

## Implementation Steps

### Step 1: Update `src/llm/tools/index.ts`

1. **Remove imports** (lines 10-13):
   ```typescript
   // DELETE these lines:
   import { createCreateNoteTool } from "./createNote";
   import { createModifyNoteTool } from "./modifyNote";
   import { createSearchNotesTool } from "./searchNotes";
   import { createOrganizeNoteTool } from "./organizeNotes";
   ```

2. **Update `createVaultTools()` function** - Remove these entries from the return array:
   ```typescript
   // DELETE these lines from the return array:
   createCreateNoteTool(app),
   createModifyNoteTool(app),
   createSearchNotesTool(app),
   createOrganizeNoteTool(app),
   ```

3. **Remove re-exports** (lines 49-52):
   ```typescript
   // DELETE these lines:
   export { createCreateNoteTool } from "./createNote";
   export { createModifyNoteTool } from "./modifyNote";
   export { createSearchNotesTool } from "./searchNotes";
   export { createOrganizeNoteTool } from "./organizeNotes";
   ```

### Step 2: Delete Old Tool Files

Delete these four files:
- `src/llm/tools/createNote.ts`
- `src/llm/tools/modifyNote.ts`
- `src/llm/tools/searchNotes.ts`
- `src/llm/tools/organizeNotes.ts`

### Step 3: Verify

Run `mise run quality` to ensure:
- TypeScript compiles without errors
- ESLint passes
- Prettier formatting is correct

## Acceptance Criteria

- [ ] `index.ts` has no imports referencing createNote, modifyNote, searchNotes, or organizeNotes
- [ ] `createVaultTools()` returns only: readFile, editFile, writeFile, createFolder, deleteFile, moveFile, searchFiles, listFiles, getFileInfo
- [ ] `index.ts` has no re-exports for old tool factory functions
- [ ] Files deleted: createNote.ts, modifyNote.ts, searchNotes.ts, organizeNotes.ts
- [ ] `mise run quality` passes (type-check, lint, format)

## Out of Scope

- Documentation updates (handled by F-update-tool-documentation)
- MessageProcessor changes (already uses createVaultTools() correctly)
- Adding any new functionality
- Updating CLAUDE.md or other docs