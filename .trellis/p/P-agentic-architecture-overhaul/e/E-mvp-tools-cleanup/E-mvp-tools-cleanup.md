---
id: E-mvp-tools-cleanup
title: MVP Tools Cleanup
status: open
priority: medium
parent: P-agentic-architecture-overhaul
prerequisites:
  - E-agentic-tools-infrastructure
  - E-agentic-conversation-state
affectedFiles: {}
log: []
schema: v1.0
childrenIds: []
created: 2026-02-04T00:47:16.263Z
updated: 2026-02-04T00:47:16.263Z
---

Remove the old MVP tools and update all references to use the new agentic tool set.

## Scope

This epic covers the cleanup work after the new tools are in place:

1. **Remove old tool files** - Delete the four MVP tool implementations
2. **Update tool exports** - Update `src/llm/tools/index.ts` for new tools
3. **Update any references** - Ensure no remaining references to old tools in codebase
4. **Update tests** - Modify tests for the new tool set

## Files to Remove

```
src/llm/tools/createNote.ts
src/llm/tools/modifyNote.ts
src/llm/tools/searchNotes.ts
src/llm/tools/organizeNotes.ts
```

## Files to Modify

- `src/llm/tools/index.ts` - Update exports for new tools

## Acceptance Criteria (from requirements)

- Old MVP tools removed (createNote, modifyNote, searchNotes, organizeNotes)
- No references to removed tools in codebase
- Tests updated for new tool set