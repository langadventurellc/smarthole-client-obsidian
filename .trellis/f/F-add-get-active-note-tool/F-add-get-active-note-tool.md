---
id: F-add-get-active-note-tool
title: Add get_active_note tool
status: done
priority: medium
parent: none
prerequisites: []
affectedFiles:
  src/llm/tools/getActiveNote.ts: Created new tool file with toolDefinition (name,
    description, empty inputSchema), formatDate helper function, and
    createGetActiveNoteTool factory function that returns file metadata or
    helpful message when no file is open
  src/llm/tools/index.ts: Added import for createGetActiveNoteTool, included it in
    createVaultTools() array, and added re-export
log:
  - "Auto-completed: All child tasks are complete"
schema: v1.0
childrenIds:
  - T-implement-get-active-note-tool
created: 2026-02-05T06:57:12.764Z
updated: 2026-02-05T06:57:12.764Z
---

## Overview

Add a new LLM tool `get_active_note` that returns metadata about the file currently open in Obsidian's editor. This enables context-aware operations where the agent can act on the user's currently focused document without requiring them to specify a path.

## Purpose

Users often want to perform operations on "this note" - the one they're currently looking at. Rather than describing the file by name, they should be able to say things like "summarize this" or "add a section to my current note." This tool provides the agent with the path and metadata needed to then use other tools (like `read_file` or `edit_file`) on that file.

## Acceptance Criteria

- [ ] Tool is named `get_active_note` and follows the existing vault tool pattern
- [ ] Tool has no input parameters (empty inputSchema properties)
- [ ] Returns the file path, name, and modification timestamp when a file is active
- [ ] Returns a clear, helpful message when no file is currently open
- [ ] Supports any file type (not just markdown) - the agent can interpret file types by extension
- [ ] Does NOT return file content (only metadata)
- [ ] Tool is included in `createVaultTools()` array
- [ ] Tool is exported from `src/llm/tools/index.ts`

## Technical Requirements

### API Usage
Use `app.workspace.getActiveFile()` which returns:
- `TFile` object when a file is active (has `path`, `name`, `basename`, `extension`, `stat`)
- `null` when no file is active (settings pane, empty workspace, non-file view)

### File Structure
Create new file: `src/llm/tools/getActiveNote.ts`

### Tool Definition
```typescript
const toolDefinition: Tool = {
  name: "get_active_note",
  description: "Get the path and metadata of the file currently open in the editor. Returns the file path, name, and modification date. Use this when the user refers to 'this note', 'the current file', or wants to operate on what they're looking at.",
  inputSchema: {
    type: "object",
    properties: {},
    required: [],
  },
};
```

### Response Format

**When a file is active:**
```
Active file: Projects/meeting-notes.md
Name: meeting-notes.md
Modified: 2026-02-04 10:30:22
```

**When no file is active:**
```
No file is currently open. The user may be viewing settings, an empty workspace, or a non-file view.
```

### Integration
1. Create factory function `createGetActiveNoteTool(app: App): ToolHandler`
2. Add to `createVaultTools()` in `src/llm/tools/index.ts`
3. Add export: `export { createGetActiveNoteTool } from "./getActiveNote";`

## Implementation Guidance

Follow the pattern established by `getFileInfo.ts`:
- Import `App` from "obsidian" and `ToolHandler` from "../LLMService"
- Import `Tool` from "../types"
- Use the same date formatting helper (`formatDate`) or create inline
- No need for `assertNotProtected()` since we're only returning metadata, not content
- Handle the `null` case gracefully with a user-friendly message

## Testing Requirements

Manual testing scenarios:
1. With a markdown file open → returns correct path and metadata
2. With a non-markdown file open (e.g., `.txt`, `.json`) → returns correct path and metadata
3. With settings pane open → returns "no file" message
4. With empty workspace → returns "no file" message
5. After switching files → returns the newly active file

## Files to Create/Modify

- **Create:** `src/llm/tools/getActiveNote.ts` (~50-70 lines)
- **Modify:** `src/llm/tools/index.ts` (add import, add to array, add re-export)