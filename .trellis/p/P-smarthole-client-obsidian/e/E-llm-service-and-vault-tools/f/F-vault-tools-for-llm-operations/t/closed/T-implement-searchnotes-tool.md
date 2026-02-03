---
id: T-implement-searchnotes-tool
title: Implement searchNotes tool
status: done
priority: high
parent: F-vault-tools-for-llm-operations
prerequisites: []
affectedFiles:
  src/llm/tools/searchNotes.ts: Created factory function
    createSearchNotesTool(app) that returns a ToolHandler for the search_notes
    tool. Uses prepareSimpleSearch() for efficient plain text search, returns up
    to 10 results with excerpts showing match context, supports optional
    read_content parameter for full file content.
  src/llm/tools/index.ts: Added export for createSearchNotesTool from the tools module.
  src/llm/index.ts: Added createSearchNotesTool to the Vault Tools exports.
log:
  - >-
    Research completed:

    - Reviewed existing tool patterns in createNote.ts and modifyNote.ts

    - ToolHandler interface: { definition: Tool; execute: (input: Record<string,
    unknown>) => Promise<string> }

    - Tool interface: { name: string; description: string; inputSchema:
    ToolInputSchema }

    - prepareSimpleSearch from Obsidian returns a function that takes text and
    returns SearchResult | null

    - SearchResult has score: number and matches: SearchMatchPart[] (where
    SearchMatchPart is [number, number])

    - Results should be limited to 10 max

    - Parameters: query (required string), read_content (optional boolean,
    default false)

    - Use vault.getMarkdownFiles() and vault.cachedRead() for efficient content
    reading


    Starting implementation...
  - >-
    Implemented the searchNotes tool for the LLM to search notes in the vault
    using Obsidian's prepareSimpleSearch API. The tool:


    - Uses prepareSimpleSearch() for efficient plain text search across all
    markdown files

    - Returns matching file paths with relevant excerpts showing match context
    (up to 3 excerpts per file with 100 chars of context around each match)

    - Limits results to 10 maximum to prevent context overflow

    - Supports optional read_content parameter to return full note content
    instead of excerpts

    - Sorts results by relevance score

    - Handles edge cases including empty queries and truncates very long content
    (>10k chars)


    The implementation follows the established patterns from createNote.ts and
    modifyNote.ts, using the factory function pattern (createSearchNotesTool)
    that returns a ToolHandler compatible with LLMService.registerTool().
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