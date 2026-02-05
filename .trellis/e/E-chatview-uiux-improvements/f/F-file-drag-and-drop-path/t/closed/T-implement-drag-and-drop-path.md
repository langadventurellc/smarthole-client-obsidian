---
id: T-implement-drag-and-drop-path
title: Implement drag-and-drop path normalization in ChatView input
status: done
priority: medium
parent: F-file-drag-and-drop-path
prerequisites: []
affectedFiles:
  src/views/ChatView.ts: "Added dragover and drop event listeners in onOpen() for
    file drag-and-drop path normalization, and added private
    insertAtCursor(text: string) method for inserting text at the textarea
    cursor position."
log:
  - Starting implementation. Reviewed ChatView.ts - identified insertion point
    for drag/drop handlers (after line 87 in onOpen, after existing input event
    handlers). Will add dragover, drop listeners and insertAtCursor private
    method.
  - Implemented drag-and-drop path normalization in the ChatView input textarea.
    Added dragover and drop event listeners in onOpen() that intercept
    obsidian:// URLs dragged from Obsidian's file explorer, parse the URL to
    extract the file parameter, decode it with decodeURIComponent(), and insert
    the clean vault-relative path at the cursor position. Added a private
    insertAtCursor() method that splices text at the cursor/selection position,
    updates the cursor, and triggers focus and auto-resize. Non-obsidian://
    drops fall through to default browser behavior. All quality checks (lint,
    format, type-check) pass.
  - >-
    Review feedback addressed:


    1. CRITICAL FIX: Removed double-decode bug. `URL.searchParams.get()` already
    percent-decodes per WHATWG URL spec, so `decodeURIComponent()` was redundant
    and would corrupt paths containing literal `%XX` sequences. Now uses
    `filePath` directly from `searchParams.get("file")`.


    2. Added comment explaining why `text/plain` is used as the dataTransfer
    type. Obsidian's file explorer provides dragged file paths as obsidian://
    URLs via `text/plain`. Other MIME types (text/uri-list, Obsidian-internal
    types) do not carry the vault-relative path directly.


    3. Testing limitation documented: The project has no test framework
    configured (no jest, vitest, or similar in devDependencies; `mise run test`
    echoes "No tests configured yet"; no jest.config or vitest.config file
    exists). Adding unit tests for insertAtCursor and the URL-to-path extraction
    logic would require installing a test runner (e.g., vitest) plus a DOM
    environment (e.g., jsdom or happy-dom) since the code operates on
    HTMLTextAreaElement. This is outside the scope of this task but would be
    valuable to set up as a separate infrastructure task.
schema: v1.0
childrenIds: []
created: 2026-02-05T19:41:58.045Z
updated: 2026-02-05T19:41:58.045Z
---

# Implement Drag-and-Drop Path Normalization in ChatView Input

## Summary
Add drag/drop event handlers to the ChatView input textarea so that files/folders dragged from Obsidian's file explorer insert clean vault-relative paths instead of `obsidian://` URLs.

## Implementation Details

### File: `src/views/ChatView.ts`

#### 1. Add drag event listeners in `onOpen()` (after existing input event handlers, ~line 87)
- Add `dragover` listener on `this.inputEl` that calls `e.preventDefault()` (required to enable drop)
- Add `drop` listener on `this.inputEl` that:
  - Calls `e.preventDefault()` and `e.stopPropagation()` to prevent default obsidian:// URL insertion
  - Extracts `text/plain` data from `e.dataTransfer`
  - If the text starts with `obsidian://`, parses it as a URL, extracts the `file` search param, decodes it with `decodeURIComponent()`, and inserts the clean path at cursor
  - If the text doesn't start with `obsidian://`, falls through to default behavior (or inserts as-is)
  - **Note:** Also explore other `dataTransfer` types (e.g., `text/uri-list`, Obsidian-specific MIME types) via `e.dataTransfer.types` — Obsidian may provide the path directly in an alternative format

#### 2. Add `insertAtCursor(text: string)` private method
- Gets current `selectionStart` and `selectionEnd` from `this.inputEl`
- Splices the text into the textarea value at the cursor/selection position
- Updates cursor position to end of inserted text
- Calls `this.inputEl.focus()` and `this.autoResizeTextarea()`

### Edge Cases
- URL-encoded characters in paths (spaces as `%20`, slashes as `%2F`) — handled by `decodeURIComponent()`
- Root-level files (no folder prefix) — works naturally since the `file` param is already vault-relative
- Files with unicode or special characters — `decodeURIComponent()` handles this
- Deeply nested paths — no special handling needed
- Both files and folders should work identically
- Files with `.md` extension — **include the extension** in the inserted path for clarity (do not strip it)

## Acceptance Criteria
- [ ] Dragging a file from file explorer into input inserts clean vault-relative path
- [ ] URL-encoded characters are properly decoded (spaces, special chars)
- [ ] Path is vault-relative (not absolute filesystem path)
- [ ] Works for both files and folders
- [ ] Path is inserted at cursor position
- [ ] If text is selected, path replaces selection
- [ ] Default obsidian:// URL insertion is prevented
- [ ] Textarea remains focused after drop
- [ ] Textarea auto-resizes after insertion