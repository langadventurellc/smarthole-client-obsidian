---
id: T-add-local-timetimezone-to
title: Add local time/timezone to system prompt and localize ConversationManager
  timestamps
status: done
priority: high
parent: F-localize-timestamps-for-llm
prerequisites:
  - T-create-formatlocaltimestamp
affectedFiles:
  src/llm/LLMService.ts: "Added formatCurrentLocalTime() private method and
    integrated it into buildSystemPrompt() to include 'The current local time
    is: ...' with IANA timezone name and UTC offset"
  src/context/ConversationManager.ts: Added import for formatLocalTimestamp;
    localized timestamps in generateConversationSummary() (line 193),
    getContextPrompt() recent conversations endedAt (line 273), and
    getContextPrompt() current conversation messages (line 284)
log:
  - >-
    Research phase complete. Read all three files to modify:

    - src/utils/time.ts: Confirmed formatLocalTimestamp utility exists

    - src/llm/LLMService.ts: Found buildSystemPrompt() at line 341, need to add
    current local time

    - src/context/ConversationManager.ts: Found getContextPrompt() at line 262,
    generateConversationSummary() at line 180


    Verified exact lines to modify:

    - LLMService.ts line 341 (buildSystemPrompt) - add current local time line
    before Guidelines section

    - ConversationManager.ts line 272 - localize c.endedAt in recent
    conversation summaries

    - ConversationManager.ts line 283 - localize msg.timestamp in current
    conversation messages

    - ConversationManager.ts line 192 - localize msg.timestamp in summary
    generation


    Proceeding to implementation.
  - Added current local time with IANA timezone and UTC offset to the LLM system
    prompt, and localized all three timestamp locations in ConversationManager
    (recent conversation endedAt, current conversation message timestamps, and
    summary generation timestamps) using the formatLocalTimestamp utility. All
    quality checks and tests pass.
schema: v1.0
childrenIds: []
created: 2026-02-05T21:27:17.192Z
updated: 2026-02-05T21:27:17.192Z
---

Add the user's current local time and timezone to the LLM system prompt, and localize all timestamps in the ConversationManager context that gets sent to the LLM.

## Files to Modify

### `src/llm/LLMService.ts` — `buildSystemPrompt()` (line 341)
- Add a line to the system prompt that includes the user's current local time with timezone
- Format: `The current local time is: Thursday, Feb 5, 2026 2:30 PM (America/New_York, UTC-5)`
- Use `Intl.DateTimeFormat().resolvedOptions().timeZone` for the IANA timezone name
- Compute the UTC offset from `new Date().getTimezoneOffset()` (note: this returns minutes, negative for east of UTC)
- Add this as a line in the Guidelines section or immediately before it
- Import is not needed — uses standard `Intl`/`Date` APIs

### `src/context/ConversationManager.ts` — `getContextPrompt()` (line 262)
- **Line 272**: Change `(ended ${c.endedAt})` to `(ended ${formatLocalTimestamp(c.endedAt)})` for recent conversation summaries — note `c.endedAt` is `string | null`, but the filter on line 267 ensures only conversations with non-null `endedAt` are included, so it's safe to assert non-null or use `c.endedAt!`
- **Line 283**: Change `[${msg.timestamp}]` to `[${formatLocalTimestamp(msg.timestamp)}]` for current conversation messages
- Add import: `import { formatLocalTimestamp } from "../utils/time";`

### `src/context/ConversationManager.ts` — `generateConversationSummary()` (line 180)
- **Line 192**: Change `[${msg.timestamp}]` to `[${formatLocalTimestamp(msg.timestamp)}]` so summaries are generated with local time context
- Import already added above

## Acceptance Criteria
1. The LLM system prompt includes the current local time with IANA timezone name and UTC offset
2. Conversation message timestamps in `getContextPrompt()` display in local time format
3. Recent conversation "ended" timestamps display in local time format
4. Conversation summarization uses local timestamps
5. `mise run quality` passes