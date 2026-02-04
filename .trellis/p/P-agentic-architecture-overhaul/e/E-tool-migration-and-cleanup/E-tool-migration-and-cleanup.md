---
id: E-tool-migration-and-cleanup
title: Tool Migration and Cleanup
status: in-progress
priority: medium
parent: P-agentic-architecture-overhaul
prerequisites:
  - E-file-operation-tools
  - E-search-and-discovery-tools
  - E-communication-and-conversation
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
log: []
schema: v1.0
childrenIds:
  - F-remove-old-mvp-tools
  - F-update-tool-documentation
created: 2026-02-04T01:58:26.761Z
updated: 2026-02-04T01:58:26.761Z
---

# Tool Migration and Cleanup

## Purpose and Goals

Remove the MVP tools and integrate all new tools into the system. This epic ensures a clean transition from the old tool set to the new agentic tools, with no dead code or broken references.

## Major Components and Deliverables

### 1. Update Tools Index (`src/llm/tools/index.ts`)
- Remove exports for old tools (createNote, modifyNote, searchNotes, organizeNotes)
- Add exports for all new tools
- Update `createVaultTools()` factory to return new tool set
- Consider `createToolContext` helper for sendMessage integration

### 2. Remove Old Tools
Delete the following files:
- `src/llm/tools/createNote.ts`
- `src/llm/tools/modifyNote.ts`
- `src/llm/tools/searchNotes.ts`
- `src/llm/tools/organizeNotes.ts`

### 3. Update Tool Registration
- Update MessageProcessor to create tools with proper context
- Pass `SendMessageContext` when creating sendMessage tool
- Ensure all tools receive necessary dependencies

### 4. Codebase Cleanup
- Remove any references to old tool names
- Update any tests that reference old tools
- Verify no dead imports or broken references

## Acceptance Criteria

### Cleanup
- [ ] Old MVP tools removed (createNote, modifyNote, searchNotes, organizeNotes)
- [ ] No references to removed tools in codebase
- [ ] Tests updated for new tool set

### Integration
- [ ] `createVaultTools()` returns all new tools
- [ ] All new tools properly registered with LLMService
- [ ] sendMessage tool receives proper context for notifications
- [ ] No TypeScript compilation errors
- [ ] Plugin loads and runs successfully

## Technical Considerations

### Tool Context Pattern
Consider a unified context interface for tools that need external dependencies:
```typescript
interface ToolContext {
  app: App;
  sendMessage?: SendMessageContext;
}
```

### Migration Strategy
1. First ensure all new tools are working
2. Update index to export new tools
3. Update createVaultTools to return new tool set
4. Delete old tool files
5. Clean up any remaining references

## Dependencies

- E-file-operation-tools (new tools must exist)
- E-search-and-discovery-tools (new tools must exist)
- E-communication-and-conversation (sendMessage must exist)

## User Stories

- As a developer, I can work with a clean codebase without dead code
- As a developer, I can easily see all available tools in the index
- As a user, the plugin continues to work after the migration

## Estimated Scale

2-3 features (index update, file deletion, cleanup verification)