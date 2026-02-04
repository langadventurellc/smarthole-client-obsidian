---
id: E-search-and-discovery-tools
title: Search and Discovery Tools
status: in-progress
priority: high
parent: P-agentic-architecture-overhaul
prerequisites:
  - E-file-operation-tools
affectedFiles:
  src/llm/tools/searchFiles.ts: Created new search_files tool with regex-based
    content search, line context extraction, protected path filtering, and
    result formatting with line numbers
log: []
schema: v1.0
childrenIds:
  - F-get-file-info-tool
  - F-list-files-tool
  - F-search-files-tool
created: 2026-02-04T01:57:52.844Z
updated: 2026-02-04T01:57:52.844Z
---

# Search and Discovery Tools

## Purpose and Goals

Implement tools for finding and exploring files in the vault, replacing the limited MVP search (which uses `prepareSimpleSearch()` with basic text matching). These tools provide regex search, glob-based file listing, and file metadata retrieval.

## Major Components and Deliverables

### 1. Search Files Tool (`src/llm/tools/searchFiles.ts`)
- Regex content search across files
- File pattern filtering (e.g., `*.md`, `Projects/**`)
- Context lines (before/after match)
- Result limits to prevent overwhelming output
- Returns file paths with matching excerpts

### 2. List Files Tool (`src/llm/tools/listFiles.ts`)
- Glob-based file listing
- Works for both finding files and exploring folder contents
- Returns files sorted by modification time (most recent first)
- Includes basic info (path, type: file/folder)
- Handles empty directories gracefully

### 3. Get File Info Tool (`src/llm/tools/getFileInfo.ts`)
- Retrieve file metadata: created date, modified date, size
- Works for both files and folders
- Clear error for non-existent paths
- Useful for "recent files" and "largest files" queries

## Acceptance Criteria

### Search
- [ ] `search_files` searches content with regex patterns
- [ ] Supports file pattern filtering (e.g., `*.md`, `Projects/**`)
- [ ] Supports context lines (before/after match)
- [ ] Limits results to prevent overwhelming output
- [ ] Returns file paths with matching excerpts

### List Files
- [ ] `list_files` supports glob patterns
- [ ] Returns files sorted by modification time (most recent first)
- [ ] Includes basic info (path, type: file/folder)
- [ ] Handles empty directories gracefully

### File Info
- [ ] `get_file_info` returns created date, modified date, size
- [ ] Works for both files and folders
- [ ] Clear error for non-existent paths

### Protected Folders
- [ ] All search/discovery tools respect protected folder restrictions
- [ ] Results do not include files from `.obsidian/` or `.smarthole/`

## Technical Considerations

- For search: Read files and match with JavaScript regex (vault sizes typically small, can optimize later)
- For glob: Use Obsidian's vault API to list files, then filter with glob patterns
- Output format should be structured for easy LLM parsing
- Consider pagination or truncation for large result sets
- File stats available via `app.vault.adapter.stat()` for modification times

## Dependencies

- E-file-operation-tools (for shared `protected.ts` utility)

## User Stories

- As an agent, I can search for specific content across all notes using regex patterns
- As an agent, I can explore folder structures to understand vault organization
- As an agent, I can find recently modified files to understand what's been worked on
- As an agent, I can get metadata about specific files without reading their contents

## Estimated Scale

3 features (one per tool)