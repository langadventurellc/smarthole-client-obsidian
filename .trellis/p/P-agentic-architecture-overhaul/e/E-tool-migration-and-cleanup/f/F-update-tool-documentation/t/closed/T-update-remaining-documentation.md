---
id: T-update-remaining-documentation
title: Update remaining documentation references to old MVP tools
status: done
priority: medium
parent: F-update-tool-documentation
prerequisites: []
affectedFiles:
  docs/llm-service.md: Updated line 97 example to use current tool names (search_files, read_file)
  docs/chat-view.md: Updated line 42 ASCII diagram to show write_file instead of create_note
log:
  - >-
    Updated two documentation files to remove references to old MVP tools:


    1. `docs/llm-service.md` (line 97): Changed example comment from
    `search_notes → read results → generate summary` to `search_files →
    read_file → generate summary`


    2. `docs/chat-view.md` (line 42): Updated ASCII diagram to show `write_file`
    instead of `create_note` as the example tool


    Both changes accurately reflect the current tool set and `mise run quality`
    passes.
schema: v1.0
childrenIds: []
created: 2026-02-04T19:28:05.277Z
updated: 2026-02-04T19:28:05.277Z
---

# Update remaining documentation references to old MVP tools

## Purpose

Remove the last remaining references to old MVP tools from documentation files that are meant to reflect current state.

## Context

Most documentation has already been updated. The main files (`docs/vault-tools.md` and `CLAUDE.md`) already accurately reflect the current tools. Only two files contain stale references in active documentation areas.

## Changes Required

### 1. `docs/llm-service.md` (Line 97)

**Current:**
```typescript
// May involve: search_notes → read results → generate summary
```

**Should be:**
```typescript
// May involve: search_files → read_file → generate summary
```

### 2. `docs/chat-view.md` (Line 42)

The ASCII diagram shows `create_note` as an example tool. Update to use a current tool name like `read_file` or `edit_file`.

## Out of Scope

- **Trellis files** (`.trellis/`) - These are historical records of past work and decisions. References to old tools in these files are intentional documentation of what was planned/implemented at the time.
- **`docs/requirements-agentic-architecture.md`** - Contains references in historical/requirements context (files to delete, problem statements, completed checkboxes). These document the migration decision and should be preserved.

## Acceptance Criteria

- [ ] `docs/llm-service.md` line 97 example uses new tool names (search_files, read_file)
- [ ] `docs/chat-view.md` diagram uses a current tool name instead of create_note
- [ ] `mise run quality` passes

## Files to Modify

- `docs/llm-service.md`
- `docs/chat-view.md`