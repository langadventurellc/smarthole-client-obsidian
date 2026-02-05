---
id: F-file-drag-and-drop-path
title: File Drag-and-Drop Path Normalization
status: open
priority: medium
parent: E-chatview-uiux-improvements
prerequisites: []
affectedFiles: {}
log: []
schema: v1.0
childrenIds: []
created: 2026-02-05T17:53:53.629Z
updated: 2026-02-05T17:53:53.629Z
---

# File Drag-and-Drop Path Normalization

## Purpose
When users drag files from Obsidian's file explorer into the ChatView input textarea, insert clean vault-relative paths instead of `obsidian://` URLs. This makes it easier to reference files in messages to the LLM agent.

## Current vs Desired Behavior

**Current (undesired):**
Dropping a file inserts: `obsidian://open?vault=the%20void&file=Projects%2FSmartHole-Obsidian-Plugin%2FFeature-Backlog`

**Desired:**
Dropping a file inserts: `Projects/SmartHole-Obsidian-Plugin/Feature-Backlog`

## Key Components to Implement

### 1. Drag Event Handlers (`src/views/ChatView.ts`)
- Add `dragover` event listener to input textarea (needed to allow drop)
- Add `drop` event listener to input textarea
- Prevent default behavior that would insert the obsidian:// URL

### 2. Path Extraction Logic (`src/views/ChatView.ts`)
- Extract file path from drag event data
- Obsidian provides file path in `dataTransfer` - check `text/plain` or Obsidian-specific data types
- Alternatively, parse the obsidian:// URL to extract the `file` parameter
- URL-decode the path (`%2F` → `/`, `%20` → space, etc.)

### 3. Path Insertion (`src/views/ChatView.ts`)
- Insert the clean path at current cursor position in textarea
- If text is selected, replace the selection
- Maintain focus on textarea after insertion

### 4. Handle Both Files and Folders
- Works for both file drops and folder drops from file explorer
- Both should insert vault-relative paths

## Acceptance Criteria
- [ ] Dragging a file from file explorer into input inserts clean vault-relative path
- [ ] URL-encoded characters are properly decoded (spaces, special chars)
- [ ] Path is vault-relative (not absolute filesystem path)
- [ ] Works for both files and folders
- [ ] Path is inserted at cursor position
- [ ] If text is selected, path replaces selection
- [ ] Default obsidian:// URL insertion is prevented

## Technical Requirements
- Use standard DOM drag/drop events (`dragover`, `drop`)
- `e.preventDefault()` on both events to prevent default insertion
- Use `decodeURIComponent()` for URL decoding
- Check multiple dataTransfer types for path extraction

## Implementation Guidance

```typescript
// In onOpen(), after creating inputEl:
this.inputEl.addEventListener("dragover", (e) => {
  e.preventDefault(); // Required to allow drop
});

this.inputEl.addEventListener("drop", (e) => {
  e.preventDefault();
  
  // Try to get the file path from drag data
  // Option 1: Check for plain text that's an obsidian:// URL
  const text = e.dataTransfer?.getData("text/plain") || "";
  
  if (text.startsWith("obsidian://")) {
    const url = new URL(text);
    const filePath = url.searchParams.get("file");
    if (filePath) {
      const cleanPath = decodeURIComponent(filePath);
      this.insertAtCursor(cleanPath);
    }
  }
  // Option 2: Obsidian may provide path directly in other data types
  // May need to experiment with e.dataTransfer.types
});

private insertAtCursor(text: string): void {
  if (!this.inputEl) return;
  const start = this.inputEl.selectionStart;
  const end = this.inputEl.selectionEnd;
  const value = this.inputEl.value;
  this.inputEl.value = value.slice(0, start) + text + value.slice(end);
  this.inputEl.selectionStart = this.inputEl.selectionEnd = start + text.length;
  this.inputEl.focus();
  this.autoResizeTextarea();
}
```

## Testing Requirements
- Verify dragging file inserts clean path (no obsidian:// URL)
- Verify path with spaces is decoded correctly
- Verify path with special characters is decoded correctly
- Verify folder drag works same as file drag
- Verify insertion at cursor position works
- Verify selection replacement works
- Verify textarea remains focused after drop

## Edge Cases to Handle
- File path with special characters (unicode, punctuation)
- Deeply nested paths
- Root-level files (no folder prefix)
- Files with `.md` extension (include or exclude? - include for clarity)

## Dependencies
- None (can be implemented independently)