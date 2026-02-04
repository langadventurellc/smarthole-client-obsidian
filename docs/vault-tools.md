# Vault Tools

LLM tools for manipulating the Obsidian vault. Each tool is a factory function that returns a `ToolHandler` with a definition and execute function.

## Available Tools

| Tool | Description |
|------|-------------|
| `create_note` | Create new markdown notes |
| `modify_note` | Modify existing notes with atomic operations |
| `search_notes` | Search notes using Obsidian's search API |
| `search_files` | Search file contents using regex patterns with context |
| `list_files` | List files and folders matching a glob pattern |
| `get_file_info` | Get file/folder metadata (dates, size) |
| `organize_note` | Rename or move notes |
| `read_file` | Read file contents with optional line ranges |
| `edit_file` | Make targeted edits using search/replace or line operations |
| `write_file` | Write content to files (create or overwrite) |
| `create_folder` | Create folders in the vault |
| `delete_file` | Soft-delete files or folders to trash |
| `move_file` | Move or rename files and folders |

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

## search_files

Search file contents using regex patterns. Provides powerful pattern matching with contextual excerpts around each match.

### Input Schema

```typescript
{
  pattern: string,           // Regex pattern to search for (required)
  file_pattern?: string,     // Glob pattern to filter files (optional)
  context_lines?: integer,   // Lines before/after match (default: 2)
  max_results?: integer      // Maximum files to return (default: 10)
}
```

### Behavior

- Uses JavaScript `RegExp` for pattern matching on each line
- When `file_pattern` is provided, searches all matching files
- When `file_pattern` is omitted, searches only markdown files
- Returns up to 5 excerpts per file to prevent overwhelming output
- Excludes protected folders (`.obsidian/`, `.smarthole/`)
- Handles invalid regex gracefully with clear error message

### Glob Pattern Support

The `file_pattern` parameter supports common glob patterns (case-insensitive matching):
- `*.md` - Markdown files in root
- `**/*.md` - All markdown files (any depth)
- `Projects/**` - All files under Projects folder (matches "projects/**" too)
- `**/*.txt` - All text files
- `folder/*` - Direct children of folder
- `folder/**` - Recursive contents of folder

### Example

```typescript
// Search for TODO patterns in markdown files
{
  name: "search_files",
  input: {
    pattern: "TODO|FIXME|XXX",
    file_pattern: "**/*.md",
    context_lines: 1,
    max_results: 20
  }
}

// Search for function definitions in all files
{
  name: "search_files",
  input: {
    pattern: "function\\s+\\w+\\s*\\(",
    file_pattern: "**/*.js"
  }
}

// Default: search markdown files only
{
  name: "search_files",
  input: {
    pattern: "meeting notes"
  }
}
```

### Response Format

```
Found 3 matching file(s):

## Projects/Alpha.md
Line 41:   some context before
Line 42: > the matching line with TODO
Line 43:   some context after

## Notes/daily.md
Line 10: > FIXME: needs review
Line 11:   following content
```

### Comparison with search_notes

| Feature | search_notes | search_files |
|---------|--------------|--------------|
| Pattern type | Simple text | Regex |
| Matching | Obsidian API | Line-by-line |
| Context | Characters around match | Lines around match |
| Use case | Natural language queries | Precise pattern matching |
| File filtering | None (all notes) | Glob patterns |

## list_files

List files and folders matching a glob pattern. Returns paths sorted by modification time (most recent first). Uses case-insensitive path resolution for the base path.

### Input Schema

```typescript
{
  pattern?: string,      // Glob pattern to match (default: '*')
  path?: string,         // Base path to search from (default: vault root)
  max_results?: integer  // Maximum items to return (1-1000, default: 100)
}
```

### Behavior

- Returns files and folders matching the glob pattern
- Sorts results by modification time (most recent first)
- Folders with unknown modification time are sorted to the end
- Excludes protected folders (`.obsidian/`, `.smarthole/`)
- Validates base path exists before searching (case-insensitive lookup)
- Returns clear error if multiple folders match with different casing (ambiguous path)
- Caps `max_results` at 1000 to prevent performance issues

### Glob Pattern Support

The `pattern` parameter supports common glob patterns (case-insensitive matching):
- `*` - Direct children of the base path (default)
- `**` - All descendants recursively
- `*.md` - Markdown files in base path
- `**/*.md` - All markdown files (any depth)
- `Projects/**` - All contents under Projects folder
- `folder/*` - Direct children of folder
- `?` - Match single character (except /)

### Example

```typescript
// List all files in vault root (default pattern)
{
  name: "list_files",
  input: {}
}

// List all markdown files
{
  name: "list_files",
  input: {
    pattern: "**/*.md"
  }
}

// List contents of a specific folder
{
  name: "list_files",
  input: {
    pattern: "*",
    path: "Projects"
  }
}

// List all files under Projects recursively
{
  name: "list_files",
  input: {
    pattern: "**",
    path: "Projects",
    max_results: 50
  }
}
```

### Response Format

```
Found 5 item(s):

[file] Projects/notes.md (modified: 2026-02-03)
[file] Projects/todo.md (modified: 2026-02-01)
[folder] Projects/Archive/
[file] README.md (modified: 2026-01-30)
[folder] Templates/
```

For no matches:
```
No files or folders match the pattern "*.xyz" in "Projects".
```

### Comparison with search_files

| Feature | list_files | search_files |
|---------|------------|--------------|
| Purpose | Explore vault structure | Find content patterns |
| Pattern type | Glob (path matching) | Regex (content matching) |
| Returns | File/folder paths with types | File paths with content excerpts |
| Sorting | By modification time | By match relevance |
| Use case | Navigation, discovery | Content search |

## get_file_info

Get metadata about a file or folder without reading its contents. Uses case-insensitive path resolution.

### Input Schema

```typescript
{
  path: string  // Path to the file or folder (required)
}
```

### Behavior

- Returns creation date, modification date, and size (for files)
- Works for both files and folders
- Uses case-insensitive path resolution (e.g., "projects" finds "Projects")
- Returns clear error if multiple files/folders match with different casing (ambiguous path)
- Blocks access to protected folders (`.obsidian/`, `.smarthole/`)
- Returns clear error for non-existent paths
- Formats dates in human-readable format (YYYY-MM-DD HH:MM:SS)
- Formats sizes in human-readable format (bytes, KB, MB)

### Example

```typescript
// Get info about a file
{
  name: "get_file_info",
  input: {
    path: "Projects/project-a.md"
  }
}

// Get info about a folder
{
  name: "get_file_info",
  input: {
    path: "Projects"
  }
}
```

### Response Format

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

### When to Use

- **Use `get_file_info`** when you need file metadata without reading content
- Useful for queries like "find recent files" or "find largest files"
- Use with `list_files` to get details about files in a directory

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

Read file contents from the vault with optional line range filtering. Uses case-insensitive path resolution for improved usability with speech-to-text input.

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
- Uses case-insensitive path resolution (e.g., "projects/readme.md" finds "Projects/README.md")
- Returns clear error if multiple files match with different casing (ambiguous path)
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

## move_file

Move or rename files and folders within the vault.

### Input Schema

```typescript
{
  source: string,       // Path to the file or folder to move (required)
  destination: string   // New path for the file or folder (required)
}
```

### Behavior

- Moves files to different locations or renames them in place
- Moves folders with all their contents
- Auto-creates parent directories for the destination
- Blocks access to protected folders (`.obsidian/`, `.smarthole/`) for both source and destination
- Validates source exists before moving
- Validates destination doesn't already exist (no overwrites)
- Handles same-path case gracefully (no-op with clear message)
- Updates internal links if Obsidian is configured to do so

### Example

```typescript
// Rename a file in place
{
  name: "move_file",
  input: {
    source: "notes/old-name.md",
    destination: "notes/new-name.md"
  }
}

// Move a file to a different folder
{
  name: "move_file",
  input: {
    source: "Inbox/meeting-notes.md",
    destination: "Meetings/2026/February/meeting-notes.md"
  }
}

// Move an entire folder
{
  name: "move_file",
  input: {
    source: "Projects/old-project",
    destination: "Archive/2026/old-project"
  }
}
```

### Response Format

Success responses:
```
Moved "notes/old-name.md" to "notes/new-name.md".
Moved "Inbox/meeting-notes.md" to "Meetings/2026/February/meeting-notes.md".
```

Same path (no-op):
```
No changes made: source and destination are the same path ("notes/file.md").
```

Error responses:
```
Error: source is required and must be a non-empty string.
Error: destination is required and must be a non-empty string.
Error: Source not found: "nonexistent.md"
Error: Destination already exists: "existing-file.md"
Error: Access denied: Cannot access files in '.obsidian/' directory (protected system folder)
```

### When to Use

- **Use `move_file`** when you need to rename files or move them to different locations
- Works for both files and folders (folders move with all contents)
- **Use `organize_note`** as an alternative for note-specific moves (adds `.md` extension automatically)

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

Protection is case-insensitive, so `.Obsidian/`, `.OBSIDIAN/`, and `.obsidian/` are all blocked.

Operations targeting these folders return a clear error:
```
Error: Access denied: Cannot access files in '.obsidian/' directory (protected system folder)
```

## Implementation

Located in `src/llm/tools/`:
- `createNote.ts` - Note creation factory
- `modifyNote.ts` - Note modification factory
- `searchNotes.ts` - Simple text search factory
- `searchFiles.ts` - Regex content search factory
- `listFiles.ts` - Glob-based file listing factory
- `getFileInfo.ts` - File/folder metadata retrieval factory
- `organizeNotes.ts` - Rename/move factory
- `readFile.ts` - File reading factory
- `editFile.ts` - Targeted file editing factory
- `writeFile.ts` - Full file write/overwrite factory
- `createFolder.ts` - Folder creation factory
- `deleteFile.ts` - File/folder deletion factory
- `moveFile.ts` - File/folder move/rename factory
- `pathUtils.ts` - Shared path normalization, glob matching (case-insensitive), and case-insensitive file/folder lookup utilities
- `protected.ts` - Protected path validation utility (case-insensitive)
- `index.ts` - `createVaultTools()` aggregator
