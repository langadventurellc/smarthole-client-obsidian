---
id: T-implement-list-files-tool
title: Implement list_files tool
status: done
priority: high
parent: F-list-files-tool
prerequisites: []
affectedFiles:
  src/llm/tools/listFiles.ts: Created new tool file with glob matching (reused
    pattern from searchFiles.ts), path normalization, modification time sorting,
    and formatted output with type indicators
  src/llm/tools/index.ts: Added import for createListFilesTool, added to
    createVaultTools() array, and added re-export
log:
  - Implemented the list_files tool for glob-based file/folder listing in the
    Obsidian vault. The tool supports glob patterns (*.md, **/*.md,
    Projects/**), returns results sorted by modification time (most recent
    first), includes type indicators ([file] vs [folder]), handles empty results
    gracefully with clear messaging, excludes protected paths (.obsidian/,
    .smarthole/), and follows the existing tool patterns established in the
    codebase.
schema: v1.0
childrenIds: []
created: 2026-02-04T04:47:20.599Z
updated: 2026-02-04T04:47:20.599Z
---

# Implement list_files tool

## Overview

Create `src/llm/tools/listFiles.ts` following the existing tool pattern to provide glob-based file/folder listing capability.

## Implementation Details

### 1. Create the tool file

Create `src/llm/tools/listFiles.ts` with the standard structure:

```typescript
/**
 * listFiles Tool
 *
 * Lists files and folders matching a glob pattern.
 * Returns paths sorted by modification time (most recent first).
 */

import type { App, TAbstractFile, TFile, TFolder } from "obsidian";
import type { ToolHandler } from "../LLMService";
import type { Tool } from "../types";
import { isProtectedPath } from "./protected";
```

### 2. Tool Definition

```typescript
const toolDefinition: Tool = {
  name: "list_files",
  description: "List files and folders matching a glob pattern. Returns paths sorted by modification time (most recent first).",
  inputSchema: {
    type: "object",
    properties: {
      pattern: {
        type: "string",
        description: "Glob pattern to match (e.g., '*.md', '**/*.md', 'Projects/**'). Default: '*' for current directory.",
      },
      path: {
        type: "string",
        description: "Base path to search from. Default: vault root.",
      },
    },
    required: [],
  },
};
```

### 3. Key Implementation Functions

#### Glob matching
- **Reuse the glob pattern** from `searchFiles.ts` - reference `globToRegex()` and `matchGlob()` implementations there
- Consider extracting to a shared utility if duplicating code

#### Get items with type
- Use `app.vault.getAllLoadedFiles()` to get all files and folders
- Filter using `instanceof TFile` vs `instanceof TFolder` to determine type
- Filter out protected paths using `isProtectedPath()`

#### Sort by modification time
- Use `app.vault.adapter.stat(path)` to get modification time
- Note: folders may not have meaningful mtime, sort them separately or use 0

#### Output formatting
```
Found N items:

[folder] Projects/
[file] Projects/project-a.md (modified: 2026-02-03)
[file] Projects/project-b.md (modified: 2026-02-01)
```

Or for empty results:
```
No files or folders match the pattern "*.xyz" in "Projects/"
```

### 4. Factory function

```typescript
export function createListFilesTool(app: App): ToolHandler {
  return {
    definition: toolDefinition,
    execute: async (input: Record<string, unknown>): Promise<string> => {
      // Implementation
    },
  };
}
```

### 5. Integration

Update `src/llm/tools/index.ts`:
1. Add import: `import { createListFilesTool } from "./listFiles";`
2. Add to `createVaultTools()` array: `createListFilesTool(app),`
3. Add re-export: `export { createListFilesTool } from "./listFiles";`

## Acceptance Criteria

- [ ] Supports glob patterns (e.g., `*.md`, `**/*.md`, `Projects/**`)
- [ ] Returns files sorted by modification time (most recent first)
- [ ] Includes type indicator (file vs folder)
- [ ] Handles empty directories gracefully with clear message
- [ ] Excludes protected folders from results
- [ ] Follows existing tool patterns (see createFolder.ts for simpler example, searchFiles.ts for glob example)
- [ ] Properly validates and normalizes input parameters

## Reference Files

- `src/llm/tools/createFolder.ts` - Simple tool pattern example
- `src/llm/tools/searchFiles.ts` - Glob matching implementation
- `src/llm/tools/protected.ts` - Protected path checking
- `src/llm/tools/index.ts` - Tool registration pattern