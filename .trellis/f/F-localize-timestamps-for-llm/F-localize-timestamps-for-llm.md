---
id: F-localize-timestamps-for-llm
title: Localize timestamps for LLM context
status: in-progress
priority: medium
parent: none
prerequisites: []
affectedFiles:
  src/utils/time.ts: "New file: exports formatLocalTimestamp(isoString) and
    formatLocalDate(mtime) utility functions for converting UTC timestamps to
    local time display strings"
  tests/utils/time.test.ts: "New file: unit tests for formatLocalTimestamp (valid
    ISO, invalid input, empty string) and formatLocalDate (valid epoch ms, NaN
    input)"
  vitest.config.ts: "New file: vitest configuration pointing to tests/**/*.test.ts"
  mise.toml: Updated test task from placeholder echo to 'npx vitest run'
  eslint.config.mjs: Added *.config.ts to ignores so vitest config is not linted
  package.json: vitest added as devDependency via npm install
  src/llm/LLMService.ts: "Added formatCurrentLocalTime() private method and
    integrated it into buildSystemPrompt() to include 'The current local time
    is: ...' with IANA timezone name and UTC offset"
  src/context/ConversationManager.ts: Added import for formatLocalTimestamp;
    localized timestamps in generateConversationSummary() (line 193),
    getContextPrompt() recent conversations endedAt (line 273), and
    getContextPrompt() current conversation messages (line 284)
log: []
schema: v1.0
childrenIds:
  - T-add-local-timetimezone-to
  - T-localize-timestamps-in-llm
  - T-create-formatlocaltimestamp
created: 2026-02-05T21:25:40.989Z
updated: 2026-02-05T21:25:40.989Z
---

## Purpose

All timestamps sent to the LLM in conversation context are currently raw UTC ISO 8601 strings (e.g., `2026-02-05T03:30:00.000Z`). This makes the agent unable to correctly interpret temporal references like "last night," "this morning," or "that conversation from yesterday" because it has no knowledge of the user's local timezone.

The ChatView UI already displays local time to the user (via `toLocaleTimeString()`), but the LLM context path uses raw UTC throughout. This feature bridges that gap so the agent receives timestamps in the user's local time and knows the current local time/timezone.

## Key Components to Implement

### 1. Timestamp formatting utility

Create a `formatLocalTimestamp(isoString: string): string` utility function that converts a UTC ISO 8601 string to a human-readable local time string.

**Format**: Use `toLocaleString()` with options that produce a clear, compact format like `Feb 5, 2026 10:30 AM`. Do NOT include timezone offset on individual message timestamps (too noisy). The timezone context comes from the system prompt instead.

**Location**: Add to a new `src/utils/time.ts` file or similar utility location.

### 2. Current time + timezone in system prompt

In `src/llm/LLMService.ts` → `buildSystemPrompt()`, add the user's current local time and timezone to the system prompt. Include both the IANA timezone name (e.g., `America/New_York`) and the UTC offset (e.g., `UTC-5`) since both are useful for an LLM — the IANA name conveys semantic meaning (daylight saving awareness) and the offset conveys the exact current difference.

Example addition to system prompt:
```
The current local time is: Thursday, Feb 5, 2026 2:30 PM (America/New_York, UTC-5)
```

Use `Intl.DateTimeFormat().resolvedOptions().timeZone` for the IANA name and compute the offset from `new Date().getTimezoneOffset()`.

### 3. Localize timestamps in ConversationManager context prompt

In `src/context/ConversationManager.ts` → `getContextPrompt()`:
- **Line 283**: Change `[${msg.timestamp}]` to `[${formatLocalTimestamp(msg.timestamp)}]` for current conversation messages
- **Line 272**: Change `(ended ${c.endedAt})` to `(ended ${formatLocalTimestamp(c.endedAt)})` for recent conversation summaries

### 4. Localize timestamps in conversation summarization

In `src/context/ConversationManager.ts` → `generateConversationSummary()`:
- **Line 192**: Change `[${msg.timestamp}]` to `[${formatLocalTimestamp(msg.timestamp)}]` so summaries are generated with local time context

### 5. Localize timestamps in getConversation tool output

In `src/llm/tools/getConversation.ts`: Format the `timestamp` field in the conversation message output returned to the LLM using `formatLocalTimestamp()`.

### 6. Localize timestamps in file metadata tools

- `src/llm/tools/getFileInfo.ts` (lines 46-51): Replace the manual `YYYY-MM-DD HH:mm:ss` formatting with `formatLocalTimestamp()` for `created` and `modified` dates
- `src/llm/tools/getActiveNote.ts` (lines 24-29): Same change for file metadata dates
- `src/llm/tools/listFiles.ts` (line 55-57): Replace `toISOString().split("T")[0]` with a local date format (date-only is fine here, but should be local date not UTC date)

## What NOT to Change

- **Storage format**: All persisted timestamps remain UTC ISO 8601 (`new Date().toISOString()`). This is a display-only change on the LLM context path.
- **ChatView UI**: Already displays local time — no changes needed.
- **Sorting/comparison logic**: All temporal logic (idle detection, conversation ordering, cleanup) continues to use UTC — no changes needed.
- **Type definitions**: Timestamps remain `string` type throughout.

## Acceptance Criteria

1. The LLM system prompt includes the current local time with timezone (IANA name + UTC offset)
2. All conversation message timestamps in the LLM context prompt display in the user's local time
3. Recent conversation "ended" timestamps display in local time
4. Conversation summarization uses local timestamps
5. The `getConversation` tool returns local-formatted timestamps to the LLM
6. File metadata tools (`getFileInfo`, `getActiveNote`, `listFiles`) return local-formatted dates
7. All persisted data continues to store UTC ISO 8601 timestamps (no storage changes)
8. `mise run quality` passes (lint + format + type-check)

## Testing Requirements

- Unit test the `formatLocalTimestamp()` utility to verify it produces the expected format and handles edge cases (invalid input, empty string)
- No integration tests needed — this is a straightforward formatting change

## Implementation Guidance

- Follow the existing pattern in `ChatView.formatTimestamp()` which already does UTC→local conversion for the UI
- Use standard `Intl` / `Date` APIs — no external date libraries needed
- The utility function should be pure (no side effects) and handle invalid input gracefully (return the original string if parsing fails)
