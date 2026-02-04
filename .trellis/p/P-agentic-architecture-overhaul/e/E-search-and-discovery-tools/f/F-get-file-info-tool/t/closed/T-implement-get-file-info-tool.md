---
id: T-implement-get-file-info-tool
title: Implement get_file_info tool
status: done
priority: high
parent: F-get-file-info-tool
prerequisites: []
affectedFiles:
  src/llm/tools/getFileInfo.ts: Created new tool file with get_file_info
    implementation including formatBytes() and formatDate() helper functions,
    tool definition, and createGetFileInfoTool() factory function
  src/llm/tools/index.ts: Added import, registration in createVaultTools() array,
    and re-export for createGetFileInfoTool
log:
  - Implemented the `get_file_info` tool that retrieves file/folder metadata
    (creation date, modification date, size) without reading file contents. The
    tool uses `app.vault.adapter.stat(path)` for metadata retrieval, formats
    output with human-readable dates (YYYY-MM-DD HH:MM:SS) and sizes (KB/MB with
    raw bytes), handles both files and folders appropriately (folders don't show
    size), returns clear error messages for non-existent paths, and rejects
    protected paths (.obsidian/, .smarthole/) using `assertNotProtected()`. The
    tool follows the existing tool patterns exactly as seen in deleteFile.ts and
    readFile.ts.
schema: v1.0
childrenIds: []
created: 2026-02-04T05:10:42.802Z
updated: 2026-02-04T05:10:42.802Z
---

# Implement get_file_info tool

## Objective

Create the `get_file_info` tool that retrieves file/folder metadata (creation date, modification date, size) without reading file contents.

## Implementation Details

### 1. Create `src/llm/tools/getFileInfo.ts`

Follow the existing tool pattern (see `readFile.ts`, `deleteFile.ts`):

```typescript
import type { App } from "obsidian";
import type { ToolHandler } from "../LLMService";
import type { Tool } from "../types";
import { assertNotProtected } from "./protected";
```

### 2. Tool Definition

```typescript
name: "get_file_info"
description: "Get metadata about a file or folder including creation date, modification date, and size."
inputSchema:
  - path (string, required): Path to the file or folder
```

### 3. Core Implementation

1. Validate path input (non-empty string)
2. Call `assertNotProtected(path)` to reject protected paths (.obsidian/, .smarthole/)
3. Use `app.vault.adapter.stat(path)` to get metadata
   - Returns `{ type, ctime, mtime, size }` or `null` if not found
4. Format output in human-readable format

### 4. Output Formatting

For files:
```
File: Projects/project-a.md
Type: file
Size: 2.4 KB (2,456 bytes)
Created: 2026-01-15 10:30:22
Modified: 2026-02-03 14:22:45
```

For folders:
```
Folder: Projects/
Type: folder
Created: 2026-01-10 09:00:00
Modified: 2026-02-03 14:22:45
```

For non-existent paths:
```
Error: Path not found: "nonexistent/file.md"
```

### 5. Helper Functions

- `formatBytes(bytes: number): string` - Format size as KB/MB with raw bytes (e.g., "2.4 KB (2,456 bytes)")
- `formatDate(timestamp: number): string` - Format timestamp as "YYYY-MM-DD HH:MM:SS"

### 6. Integration

Update `src/llm/tools/index.ts`:
1. Add import: `import { createGetFileInfoTool } from "./getFileInfo";`
2. Add to `createVaultTools()` array: `createGetFileInfoTool(app),`
3. Add re-export: `export { createGetFileInfoTool } from "./getFileInfo";`

## Technical Notes

- `app.vault.adapter.stat()` returns `null` for non-existent paths
- `ctime` and `mtime` are timestamps in milliseconds
- `type` is "file" or "folder"

## Acceptance Criteria

- [ ] Returns created date, modified date, size for files
- [ ] Works for both files and folders (folders don't show size)
- [ ] Clear error message for non-existent paths
- [ ] Rejects access to protected paths with appropriate error
- [ ] Human-readable date formatting (YYYY-MM-DD HH:MM:SS)
- [ ] Human-readable size formatting (KB/MB with raw bytes)
- [ ] Follows existing tool patterns exactly
- [ ] Exported from index.ts and included in createVaultTools()