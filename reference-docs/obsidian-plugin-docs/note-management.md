# Note Management (CRUD Operations)

The `Vault` API provides comprehensive file operations for creating, reading, updating, and deleting notes.

## Reading Files

```typescript
// Get all markdown files
const files = this.app.vault.getMarkdownFiles();

// Get all files (including non-markdown)
const allFiles = this.app.vault.getFiles();

// Read file content (use cachedRead for display, read for modification)
const content = await this.app.vault.cachedRead(file);  // Uses cache
const content = await this.app.vault.read(file);        // Always from disk

// Get file by path
const file = this.app.vault.getFileByPath('folder/note.md');
const folder = this.app.vault.getFolderByPath('folder');
const abstractFile = this.app.vault.getAbstractFileByPath('path');

// Check if file or folder
if (abstractFile instanceof TFile) {
  // It's a file
} else if (abstractFile instanceof TFolder) {
  // It's a folder
}
```

## Creating Files

```typescript
// Create a new file
const newFile = await this.app.vault.create(
  'folder/new-note.md',  // Path with extension
  'Initial content',      // Content
  options                 // Optional DataWriteOptions
);

// Create a folder
await this.app.vault.createFolder('new-folder');

// Create binary file
await this.app.vault.createBinary('path/file.png', arrayBuffer);
```

## Modifying Files

```typescript
// Simple modification (replaces entire content)
await this.app.vault.modify(file, 'New content');

// Process-based modification (recommended - atomic read-modify-write)
await this.app.vault.process(file, (data) => {
  return data.replace('old text', 'new text');
});
```

**Important:** Always prefer `vault.process()` over separate `read()`/`modify()` calls to prevent data loss from concurrent modifications.

## Asynchronous Modifications

For async operations within modifications:

```typescript
// 1. Read the file
const data = await this.app.vault.cachedRead(file);

// 2. Perform async operations
const processedData = await someAsyncOperation(data);

// 3. Update using process() with validation
await this.app.vault.process(file, (currentData) => {
  if (currentData !== data) {
    // File changed, handle conflict
    throw new Error('File was modified');
  }
  return processedData;
});
```

## Deleting Files

```typescript
// Permanent deletion
await this.app.vault.delete(file);

// Move to trash (system or .trash folder)
await this.app.vault.trash(file, useSystemTrash);
```

**Documentation:**
- [/Users/zach/code/obsidian-developer-docs/en/Plugins/Vault.md](/Users/zach/code/obsidian-developer-docs/en/Plugins/Vault.md)
- [/Users/zach/code/obsidian-developer-docs/en/Reference/TypeScript API/Vault.md](/Users/zach/code/obsidian-developer-docs/en/Reference/TypeScript%20API/Vault.md)
- [/Users/zach/code/obsidian-developer-docs/en/Reference/TypeScript API/Vault/create.md](/Users/zach/code/obsidian-developer-docs/en/Reference/TypeScript%20API/Vault/create.md)
- [/Users/zach/code/obsidian-developer-docs/en/Reference/TypeScript API/Vault/delete.md](/Users/zach/code/obsidian-developer-docs/en/Reference/TypeScript%20API/Vault/delete.md)
