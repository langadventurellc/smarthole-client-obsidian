---
id: T-implement-get-active-note-tool
title: Implement get_active_note tool
status: done
priority: medium
parent: F-add-get-active-note-tool
prerequisites: []
affectedFiles:
  src/llm/tools/getActiveNote.ts: Created new tool file with toolDefinition (name,
    description, empty inputSchema), formatDate helper function, and
    createGetActiveNoteTool factory function that returns file metadata or
    helpful message when no file is open
  src/llm/tools/index.ts: Added import for createGetActiveNoteTool, included it in
    createVaultTools() array, and added re-export
log:
  - Implemented the get_active_note tool that returns metadata about the
    currently open file in Obsidian. The tool uses app.workspace.getActiveFile()
    to retrieve the active file, returning the file path, name, and modification
    date when a file is open, or a helpful message when no file is active. The
    tool follows the established pattern from getFileInfo.ts and is integrated
    into the vault tools array.
schema: v1.0
childrenIds: []
created: 2026-02-05T17:18:12.647Z
updated: 2026-02-05T17:18:12.647Z
---

Create the `get_active_note` tool that returns metadata about the currently open file in Obsidian.

## Implementation Details

1. Create `src/llm/tools/getActiveNote.ts` following the `getFileInfo.ts` pattern:
   - Import `App` from "obsidian", `ToolHandler` from "../LLMService", `Tool` from "../types"
   - Define `toolDefinition` constant with:
     - name: "get_active_note"
     - description: "Get the path and metadata of the file currently open in the editor. Returns the file path, name, and modification date. Use this when the user refers to 'this note', 'the current file', or wants to operate on what they're looking at."
     - inputSchema: `{ type: "object", properties: {}, required: [] }`
   - Create `formatDate` helper (copy from getFileInfo.ts or import if shared)
   - Implement `createGetActiveNoteTool(app: App): ToolHandler`

2. Tool behavior:
   - Use `app.workspace.getActiveFile()` to get the active file
   - When file is active: return formatted string with path, name, and modification date
   - When no file is active: return helpful message explaining the user may be in settings, empty workspace, or non-file view

3. Integrate into `src/llm/tools/index.ts`:
   - Add import: `import { createGetActiveNoteTool } from "./getActiveNote";`
   - Add to `createVaultTools()` array: `createGetActiveNoteTool(app),`
   - Add re-export: `export { createGetActiveNoteTool } from "./getActiveNote";`

## Response Format

**When file is active:**
```
Active file: Projects/meeting-notes.md
Name: meeting-notes.md
Modified: 2026-02-04 10:30:22
```

**When no file is active:**
```
No file is currently open. The user may be viewing settings, an empty workspace, or a non-file view.
```

## Notes
- No input parameters required (empty inputSchema)
- No `assertNotProtected()` needed since we only return metadata, not content
- Supports any file type (not just markdown)