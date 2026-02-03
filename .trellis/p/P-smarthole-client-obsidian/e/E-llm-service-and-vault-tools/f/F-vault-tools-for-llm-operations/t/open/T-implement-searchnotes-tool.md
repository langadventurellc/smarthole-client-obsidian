---
id: T-implement-searchnotes-tool
title: Implement searchNotes tool
status: open
priority: high
parent: F-vault-tools-for-llm-operations
prerequisites: []
affectedFiles: {}
log: []
schema: v1.0
childrenIds: []
created: 2026-02-03T06:50:33.708Z
updated: 2026-02-03T06:50:33.708Z
---

# Implement searchNotes tool

## Overview
Implement the search tool that allows the LLM to find notes in the vault using plain text search.

## Files to Create

### src/llm/tools/searchNotes.ts
- Export a `ToolHandler` compatible with `LLMService.registerTool()`
- Tool name: `search_notes`
- Parameters:
  - `query` (required string): Search query to find in notes
  - `read_content` (optional boolean): Whether to return full content of matches (default false)
- Functionality:
  - Use `prepareSimpleSearch()` from Obsidian API (NOT fuzzy search)
  - Search all markdown files in vault using `vault.getMarkdownFiles()`
  - Use `vault.cachedRead()` for efficient content reading
  - Return matching file paths with relevant excerpts showing match context
  - Limit results to max 10 to prevent context overflow
  - When `read_content` is true, return full content of matches

## Technical Context

The `ToolHandler` interface from `src/llm/LLMService.ts:26-31`:
```typescript
export interface ToolHandler {
  definition: Tool;
  execute: (input: Record<string, unknown>) => Promise<string>;
}
```

Search implementation pattern from feature spec:
```typescript
import { prepareSimpleSearch } from 'obsidian';

const search = prepareSimpleSearch(query);
for (const file of vault.getMarkdownFiles()) {
  const content = await vault.cachedRead(file);
  if (search(content)) { /* match */ }
}
```

## Acceptance Criteria
- searchNotes finds notes matching query
- searchNotes returns excerpts with match context (surrounding lines/text)
- searchNotes limits results to 10 maximum
- searchNotes can optionally return full content of specific files
- Tool has proper Claude tool definition with clear parameter schema