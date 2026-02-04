---
id: F-read-file-tool
title: Read File Tool
status: open
priority: high
parent: E-file-operation-tools
prerequisites: []
affectedFiles: {}
log: []
schema: v1.0
childrenIds: []
created: 2026-02-04T02:03:44.378Z
updated: 2026-02-04T02:03:44.378Z
---

Implement the `read_file` tool for reading file contents from the vault, along with the shared protected folder utility.

## Scope

### Protected Folder Check (src/llm/tools/protected.ts)
Shared utility for all file operation tools:
- Export `isProtectedPath(relativePath: string): boolean` function
- Block access to `.obsidian/` and `.smarthole/` directories
- Export `assertNotProtected(path: string): void` that throws with clear error message
- Normalize paths (handle backslashes, trailing slashes)

### Read File Tool (src/llm/tools/readFile.ts)
- Read file contents using `app.vault.read()` API
- Support optional `start_line` and `end_line` parameters for partial reads
- Return content with line numbers prefixed (e.g., "1: First line\n2: Second line")
- Handle large files with smart truncation (configurable limit, default ~100KB)
- Return clear error for non-existent files
- Call `assertNotProtected()` before reading
- Follow existing tool pattern: factory function returning `ToolHandler`

## Acceptance Criteria
- [ ] `isProtectedPath()` correctly identifies `.obsidian/` paths
- [ ] `isProtectedPath()` correctly identifies `.smarthole/` paths
- [ ] `assertNotProtected()` throws descriptive error for protected paths
- [ ] `read_file` reads file contents successfully
- [ ] `read_file` supports `start_line` and `end_line` parameters
- [ ] `read_file` returns content with line numbers
- [ ] `read_file` truncates large files with indication of truncation
- [ ] `read_file` returns clear error for non-existent files
- [ ] `read_file` blocks access to protected folders

## Technical Notes
- Use `app.vault.getFileByPath()` to check existence
- Use `app.vault.read()` to get content
- Line numbers are 1-indexed for user-friendliness
- Truncation should indicate total lines and show message like "[... truncated, showing lines 1-500 of 2000]"