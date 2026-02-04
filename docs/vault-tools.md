# Vault Tools

LLM tools for manipulating the Obsidian vault. Each tool is a factory function that returns a `ToolHandler` with a definition and execute function.

## Available Tools

| Tool | Description |
|------|-------------|
| `create_note` | Create new markdown notes |
| `modify_note` | Modify existing notes with atomic operations |
| `search_notes` | Search notes using Obsidian's search API |
| `organize_note` | Rename or move notes |
| `read_file` | Read file contents with optional line ranges |
| `edit_file` | Make targeted edits using search/replace or line operations |
| `write_file` | Write content to files (create or overwrite) |
| `create_folder` | Create folders in the vault |
| `delete_file` | Soft-delete files or folders to trash |

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

## read_file

Read file contents from the vault with optional line range filtering.

### Input Schema

```typescript
{
  path: string,         // File path (required)
  start_line?: integer, // First line to read, 1-indexed (optional)
  end_line?: integer    // Last line to read, 1-indexed (optional)
}
```

### Behavior

- Returns content with line numbers prefixed (e.g., "1: First line\n2: Second line")
- Supports optional `start_line` and `end_line` for partial reads
- Handles large files with smart truncation (~100KB or 2000 lines)
- Blocks access to protected folders (`.obsidian/`, `.smarthole/`)
- Returns clear error for non-existent files

### Example

```typescript
// Read entire file
{
  name: "read_file",
  input: {
    path: "Projects/notes.md"
  }
}

// Read specific line range
{
  name: "read_file",
  input: {
    path: "Projects/long-document.md",
    start_line: 50,
    end_line: 100
  }
}
```

### Response Format

```
1: # Document Title
2:
3: First paragraph content...
4: More content here...

[Showing lines 1-4 of 4 total]
```

For truncated files:
```
1: First line...
...
2000: Last shown line...

[... truncated, showing lines 1-2000, total lines in file: 5000]
```

## edit_file

Make targeted edits to files using search/replace or line-based operations.

### Input Schema

```typescript
{
  path: string,              // File path (required)

  // Search/Replace mode (mutually exclusive with line operations)
  old_text?: string,         // Text to search for and replace
  new_text?: string,         // Text to replace old_text with
  replace_all?: boolean,     // Replace all occurrences (default: false, first only)

  // Line-based mode (mutually exclusive with search/replace)
  insert_after_line?: integer,   // Line number after which to insert (0 = beginning)
  insert_before_line?: integer,  // Line number before which to insert (1-indexed)
  delete_lines?: {               // Line range to delete
    start: integer,              // First line to delete (1-indexed)
    end: integer                 // Last line to delete (1-indexed, inclusive)
  },
  content?: string           // Content to insert (required for insert operations)
}
```

### Behavior

- **Mutually exclusive modes**: Use either search/replace OR line-based operations, not both
- Uses `vault.process()` for atomic operations
- Blocks access to protected folders (`.obsidian/`, `.smarthole/`)
- Returns clear error messages with context (e.g., "Text 'foo' not found in file.md")
- Returns summary of changes made (e.g., "Replaced 3 occurrences" or "Inserted 5 lines after line 42")

### Search/Replace Mode

Replace text patterns in a file:
- `replace_all: false` (default): Replaces only the first occurrence
- `replace_all: true`: Replaces all occurrences

```typescript
// Replace first occurrence
{
  name: "edit_file",
  input: {
    path: "notes/todo.md",
    old_text: "[ ]",
    new_text: "[x]"
  }
}

// Replace all occurrences
{
  name: "edit_file",
  input: {
    path: "notes/document.md",
    old_text: "2025",
    new_text: "2026",
    replace_all: true
  }
}
```

### Line-Based Operations

Only one line operation can be specified at a time.

**Insert after a line:**
```typescript
// Insert at the very beginning (line 0)
{
  name: "edit_file",
  input: {
    path: "notes/log.md",
    insert_after_line: 0,
    content: "# Header\n\nNew content at top"
  }
}

// Insert after line 5
{
  name: "edit_file",
  input: {
    path: "notes/list.md",
    insert_after_line: 5,
    content: "- New item"
  }
}
```

**Insert before a line:**
```typescript
// Insert before line 10
{
  name: "edit_file",
  input: {
    path: "notes/document.md",
    insert_before_line: 10,
    content: "## New Section"
  }
}
```

**Delete lines:**
```typescript
// Delete lines 5-10 (inclusive)
{
  name: "edit_file",
  input: {
    path: "notes/document.md",
    delete_lines: {
      start: 5,
      end: 10
    }
  }
}
```

### Response Format

Success responses indicate what was done:
```
Replaced 1 occurrence in "notes/todo.md".
Replaced 3 occurrences in "notes/document.md".
Inserted 5 lines after line 42 in "notes/log.md".
Deleted lines 5-10 (6 lines) in "notes/document.md".
```

Error responses provide context:
```
Error: Text 'foo' not found in notes.md
Error: Line 50 does not exist in file with 30 lines.
Error: Cannot mix search/replace parameters with line-based parameters.
```

## write_file

Write content to a file, creating it if it doesn't exist or overwriting if it does.

### Input Schema

```typescript
{
  path: string,      // File path (required)
  content: string    // Content to write (required)
}
```

### Behavior

- Creates the file if it doesn't exist
- Overwrites the file if it already exists
- Auto-creates parent directories as needed
- Blocks access to protected folders (`.obsidian/`, `.smarthole/`)
- Returns confirmation with file path and size

### Example

```typescript
// Create a new file
{
  name: "write_file",
  input: {
    path: "Projects/new-project.md",
    content: "# New Project\n\nProject description here..."
  }
}

// Overwrite an existing file
{
  name: "write_file",
  input: {
    path: "notes/draft.md",
    content: "# Updated Content\n\nCompletely new content."
  }
}
```

### Response Format

Success responses indicate the action taken:
```
Created file "Projects/new-project.md" (156 bytes).
Overwrote file "notes/draft.md" (2.3 KB).
```

Error responses:
```
Error: path is required and must be a non-empty string.
Error: Access denied: Cannot access files in '.obsidian/' directory (protected system folder)
Error: Failed to write file "invalid/path.md": <error details>
```

### When to Use

- **Use `write_file`** when you need to completely replace file contents or create a new file with known content
- **Use `create_note`** when creating markdown notes with auto-generated filenames from content
- **Use `edit_file`** when making targeted changes to existing files (search/replace, line operations)

## create_folder

Create folders in the vault, including nested folder structures.

### Input Schema

```typescript
{
  path: string  // Folder path to create (required)
}
```

### Behavior

- Creates the specified folder in the vault
- Automatically creates parent directories if they don't exist
- Returns informative message if folder already exists (not an error)
- Blocks access to protected folders (`.obsidian/`, `.smarthole/`)
- Normalizes path (removes leading/trailing slashes)
- Returns error for empty or root path

### Example

```typescript
// Create a single folder
{
  name: "create_folder",
  input: {
    path: "Projects"
  }
}

// Create nested folder structure
{
  name: "create_folder",
  input: {
    path: "Archive/2026/January"
  }
}
```

### Response Format

Success responses:
```
Created folder "Projects".
Created folder "Archive/2026/January".
```

If folder already exists:
```
Folder "Projects" already exists.
```

Error responses:
```
Error: path is required and must be a string.
Error: path cannot be empty or root.
Error: Access denied: Cannot access files in '.obsidian/' directory (protected system folder)
```

### When to Use

- **Use `create_folder`** when you need to create an empty folder structure before adding files
- **Use `create_note` or `write_file`** when creating files (they auto-create parent folders)

## delete_file

Soft-delete files or folders to Obsidian's trash. Respects user's trash settings.

### Input Schema

```typescript
{
  path: string  // Path to the file or folder to delete (required)
}
```

### Behavior

- Soft-deletes the file or folder to trash (not permanent deletion)
- Respects user's Obsidian trash settings:
  - `system`: Uses system trash (Recycle Bin / macOS Trash)
  - `local`: Uses `.trash/` folder in vault
  - `none`: Permanent deletion (based on Obsidian settings)
- Deletes folders with all their contents
- Blocks access to protected folders (`.obsidian/`, `.smarthole/`)
- Returns clear error for non-existent files/folders

### Example

```typescript
// Delete a file
{
  name: "delete_file",
  input: {
    path: "notes/old-note.md"
  }
}

// Delete a folder (and all contents)
{
  name: "delete_file",
  input: {
    path: "Archive/2024"
  }
}
```

### Response Format

Success responses:
```
Deleted 'notes/old-note.md' to trash.
Deleted 'Archive/2024' to trash.
```

Error responses:
```
Error: path is required and must be a non-empty string.
Error: File or folder not found: "nonexistent.md"
Error: Access denied: Cannot access files in '.obsidian/' directory (protected system folder)
```

### When to Use

- **Use `delete_file`** when you need to remove files or folders from the vault
- Files go to trash (recoverable) rather than being permanently deleted
- The exact trash behavior depends on user's Obsidian settings

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

## Protected Paths

All file operation tools share protected path validation via `src/llm/tools/protected.ts`. The following directories are protected and cannot be accessed:

- `.obsidian/` - Obsidian configuration (could break the app)
- `.smarthole/` - Internal storage (inbox, trash, etc.)

Operations targeting these folders return a clear error:
```
Error: Access denied: Cannot access files in '.obsidian/' directory (protected system folder)
```

## Implementation

Located in `src/llm/tools/`:
- `createNote.ts` - Note creation factory
- `modifyNote.ts` - Note modification factory
- `searchNotes.ts` - Search factory
- `organizeNotes.ts` - Rename/move factory
- `readFile.ts` - File reading factory
- `editFile.ts` - Targeted file editing factory
- `writeFile.ts` - Full file write/overwrite factory
- `createFolder.ts` - Folder creation factory
- `deleteFile.ts` - File/folder deletion factory
- `protected.ts` - Protected path validation utility
- `index.ts` - `createVaultTools()` aggregator
