---
id: T-localize-timestamps-in-llm
title: Localize timestamps in LLM tool outputs (getConversation, getFileInfo,
  getActiveNote, listFiles)
status: open
priority: medium
parent: F-localize-timestamps-for-llm
prerequisites:
  - T-create-formatlocaltimestamp
affectedFiles: {}
log: []
schema: v1.0
childrenIds: []
created: 2026-02-05T21:27:32.516Z
updated: 2026-02-05T21:27:32.516Z
---

Update all vault/conversation tools that return timestamps to the LLM to use the new `formatLocalTimestamp()` / `formatLocalDate()` utilities instead of raw UTC or manually formatted dates.

## Files to Modify

### `src/llm/tools/getConversation.ts` (line 160)
- In the `messages.map()` on line 159-164, change `timestamp: msg.timestamp` to `timestamp: formatLocalTimestamp(msg.timestamp)`
- Add import: `import { formatLocalTimestamp } from "../../utils/time";`

### `src/llm/tools/getFileInfo.ts`
- **Remove the local `formatDate()` function** (lines 46-57) — it manually formats `YYYY-MM-DD HH:mm:ss` using local `Date` methods
- Replace with `formatLocalTimestamp()` from `../../utils/time`
- Note: `formatDate()` here takes a `number` (epoch ms) while `formatLocalTimestamp()` takes an ISO string. You'll need to convert: `formatLocalTimestamp(new Date(timestamp).toISOString())` — OR add a numeric overload. Since the feature spec says to use `formatLocalTimestamp()`, convert the number to ISO string first.
- Add import: `import { formatLocalTimestamp } from "../../utils/time";`
- Update usages on lines 100, 101, 119, 120

### `src/llm/tools/getActiveNote.ts`
- **Remove the local `formatDate()` function** (lines 24-35) — same manual format as getFileInfo
- Replace with `formatLocalTimestamp()` from `../../utils/time`
- Same number→ISO string conversion needed
- Add import: `import { formatLocalTimestamp } from "../../utils/time";`
- Update usage on line 58

### `src/llm/tools/listFiles.ts` (line 55-57)
- Replace `date.toISOString().split("T")[0]` with `formatLocalDate(mtime)` — this already takes a number (epoch ms) and returns a local date string
- The current code returns UTC date (`toISOString()` is always UTC), so a file modified at 11 PM EST on Feb 5 would show Feb 6. Using local date fixes this.
- Add import: `import { formatLocalDate } from "../../utils/time";`
- Update `formatDate()` function on lines 55-58 (can replace entire function body or replace it with imported `formatLocalDate`)

## Acceptance Criteria
1. `getConversation` tool returns local-formatted timestamps to the LLM
2. `getFileInfo` tool returns local-formatted created/modified dates
3. `getActiveNote` tool returns local-formatted modified date
4. `listFiles` tool returns local date (not UTC date) for file modification times
5. Duplicate `formatDate()` functions removed from getFileInfo and getActiveNote (replaced by shared utility)
6. `mise run quality` passes