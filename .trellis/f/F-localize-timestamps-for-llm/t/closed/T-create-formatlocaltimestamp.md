---
id: T-create-formatlocaltimestamp
title: Create formatLocalTimestamp utility and unit tests
status: done
priority: high
parent: F-localize-timestamps-for-llm
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
log:
  - Created formatLocalTimestamp and formatLocalDate utility functions in
    src/utils/time.ts, with unit tests in tests/utils/time.test.ts. Set up
    vitest test infrastructure (installed vitest, created vitest.config.ts,
    updated mise.toml test task). Both functions use Intl/Date toLocaleString
    APIs for locale-aware formatting. Invalid inputs are handled gracefully by
    returning the original value. All 5 tests pass. Quality checks (lint +
    format + type-check) pass.
schema: v1.0
childrenIds: []
created: 2026-02-05T21:27:03.384Z
updated: 2026-02-05T21:27:03.384Z
---

Create the `formatLocalTimestamp(isoString: string): string` utility function that all other tasks depend on.

## Files to Create/Modify

### `src/utils/time.ts` (new file)
- Export `formatLocalTimestamp(isoString: string): string` — converts a UTC ISO 8601 string to a human-readable local time string
- **Format**: Use `toLocaleString()` with options that produce a clear, compact format like `Feb 5, 2026 10:30 AM`
- Do NOT include timezone offset on individual timestamps (timezone context comes from system prompt)
- Handle invalid input gracefully: return the original string if parsing fails (e.g., invalid date, empty string)
- Function should be pure (no side effects)
- Follow the pattern in `ChatView.formatTimestamp()` (src/views/ChatView.ts:411) which already does UTC→local conversion for the UI, but produce a different format (absolute local time, not relative "2 min ago")
- Also export a `formatLocalDate(mtime: number): string` helper that takes a numeric timestamp (epoch ms) and returns a local date string like `Feb 5, 2026` — this is for `listFiles.ts` which only needs the date portion

### `tests/utils/time.test.ts` (new file, if test infrastructure exists — check for existing test files first)
- Unit test `formatLocalTimestamp()`:
  - Valid ISO string produces expected format
  - Invalid input returns original string
  - Empty string returns empty string
- Unit test `formatLocalDate()`:
  - Valid timestamp produces expected date format

## Acceptance Criteria
- `formatLocalTimestamp()` converts UTC ISO 8601 to local time format like `Feb 5, 2026 10:30 AM`
- `formatLocalDate()` converts epoch ms to local date format like `Feb 5, 2026`
- Invalid inputs handled gracefully (return original string)
- `mise run quality` passes