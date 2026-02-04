---
id: F-get-file-info-tool
title: Get File Info Tool
status: done
priority: high
parent: E-search-and-discovery-tools
prerequisites: []
affectedFiles:
  src/llm/tools/getFileInfo.ts: Created new tool file with get_file_info
    implementation including formatBytes() and formatDate() helper functions,
    tool definition, and createGetFileInfoTool() factory function
  src/llm/tools/index.ts: Added import, registration in createVaultTools() array,
    and re-export for createGetFileInfoTool
log:
  - "Auto-completed: All child tasks are complete"
schema: v1.0
childrenIds:
  - T-implement-get-file-info-tool
created: 2026-02-04T04:20:00.423Z
updated: 2026-02-04T04:20:00.423Z
---

# Get File Info Tool

## Purpose

Create a `get_file_info` tool to retrieve file metadata (creation date, modification date, size) without reading the file contents. Useful for queries like "recent files" or "largest files".

## Implementation

Create `src/llm/tools/getFileInfo.ts` following the existing tool pattern.

### Tool Definition

```typescript
name: "get_file_info"
description: "Get metadata about a file or folder including creation date, modification date, and size."
```

### Input Schema

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `path` | string | Yes | Path to the file or folder |

### Key Implementation Details

1. **Stat API**: Use `app.vault.adapter.stat(path)` which returns `{ type, ctime, mtime, size }`
2. **Works for Both**: Handle both files and folders
3. **Protected Paths**: Use `assertNotProtected()` to reject access to protected directories
4. **Human-Readable Format**: Format dates and sizes for easy reading

### Output Format

For a file:
```
File: Projects/project-a.md
Type: file
Size: 2.4 KB (2,456 bytes)
Created: 2026-01-15 10:30:22
Modified: 2026-02-03 14:22:45
```

For a folder:
```
Folder: Projects/
Type: folder
Created: 2026-01-10 09:00:00
Modified: 2026-02-03 14:22:45
```

For non-existent path:
```
Error: Path not found: "nonexistent/file.md"
```

### Integration

1. Export `createGetFileInfoTool(app: App): ToolHandler` function
2. Add to `index.ts` exports and `createVaultTools()` array

## Technical Notes

- `app.vault.adapter.stat()` returns `null` for non-existent paths
- `ctime` and `mtime` are timestamps in milliseconds
- Size is in bytes, format as KB/MB for readability

## Acceptance Criteria

- [ ] Returns created date, modified date, size
- [ ] Works for both files and folders
- [ ] Clear error for non-existent paths
- [ ] Rejects access to protected paths
- [ ] Human-readable date and size formatting
- [ ] Follows existing tool patterns