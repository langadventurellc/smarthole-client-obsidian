# Vault Tools

LLM tools for manipulating the Obsidian vault. Each tool is a factory function that returns a `ToolHandler` with a definition and execute function.

## Available Tools

| Tool | Description |
|------|-------------|
| `create_note` | Create new markdown notes |
| `modify_note` | Modify existing notes with atomic operations |
| `search_notes` | Search notes using Obsidian's search API |
| `organize_note` | Rename or move notes |

## Usage

```typescript
import { createVaultTools } from "./llm/tools";

const tools = createVaultTools(app);
tools.forEach((tool) => llmService.registerTool(tool));
```

## create_note

Create new markdown notes in the vault.

### Input Schema

```typescript
{
  content: string,     // Note content (required)
  path?: string,       // Target path (optional, auto-generated if omitted)
  title?: string       // Note title (optional, extracted from content if omitted)
}
```

### Behavior

- Auto-generates filename from H1 heading or first line if path not specified
- Creates parent folders automatically
- Adds `.md` extension if missing
- Returns created file path on success

### Example

```typescript
// LLM call
{
  name: "create_note",
  input: {
    content: "# Meeting Notes\n\nDiscussed project timeline...",
    path: "Meetings/2026-02-03.md"
  }
}
```

## modify_note

Modify existing notes with atomic read-modify-write operations.

### Input Schema

```typescript
{
  path: string,                      // File path (required)
  operation: "append" | "prepend" | "replace",  // Operation type (required)
  content: string,                   // Content to add/replace with (required)
  search?: string                    // Text to find (required for replace)
}
```

### Behavior

- Uses `vault.process()` for atomic operations
- `append` adds content to end of file
- `prepend` adds content to beginning of file
- `replace` finds and replaces text (requires `search` parameter)
- Fails gracefully if file not found

### Example

```typescript
// Append to a note
{
  name: "modify_note",
  input: {
    path: "Journal/daily.md",
    operation: "append",
    content: "\n\n## Evening Update\nCompleted all tasks."
  }
}
```

## search_notes

Search notes using Obsidian's `prepareSimpleSearch()` API.

### Input Schema

```typescript
{
  query: string,         // Search query (required)
  read_content?: boolean // Return full file content (default: false)
}
```

### Behavior

- Returns up to 10 matching files
- By default returns file paths and match excerpts
- With `read_content: true`, returns full file contents
- Results sorted by relevance

### Example

```typescript
// Search for project notes
{
  name: "search_notes",
  input: {
    query: "project timeline",
    read_content: true
  }
}
```

### Response Format

```typescript
{
  results: [
    {
      path: "Projects/Alpha.md",
      excerpt: "...project timeline is set for Q2...",
      content?: "# Alpha Project\n\nFull content here..."
    }
  ]
}
```

## organize_note

Rename or move notes within the vault.

### Input Schema

```typescript
{
  source: string,       // Current file path (required)
  destination: string   // New file path (required)
}
```

### Behavior

- Creates destination folders automatically
- Validates against overwrites (fails if destination exists)
- Adds `.md` extension if missing
- Updates internal links if Obsidian is configured to do so

### Example

```typescript
// Move a note to a different folder
{
  name: "organize_note",
  input: {
    source: "Inbox/meeting-notes.md",
    destination: "Meetings/2026/February/meeting-notes.md"
  }
}
```

## Tool Handler Interface

```typescript
interface ToolHandler {
  tool: Tool;                                           // Tool definition for LLM
  execute: (input: Record<string, unknown>) => Promise<unknown>;  // Execution function
}

interface Tool {
  name: string;
  description: string;
  input_schema: JSONSchema;
}
```

## Path Normalization

All tools normalize paths consistently:
- Ensure `.md` extension is present
- Handle leading/trailing slashes
- Create missing parent directories

## Implementation

Located in `src/llm/tools/`:
- `createNote.ts` - Note creation factory
- `modifyNote.ts` - Note modification factory
- `searchNotes.ts` - Search factory
- `organizeNotes.ts` - Rename/move factory
- `index.ts` - `createVaultTools()` aggregator
