---
id: T-add-verbose-debug-logging
title: Add verbose debug logging toggle for LLM and tool execution
status: done
priority: medium
parent: none
prerequisites:
  - T-fix-max-tokens-truncation
affectedFiles:
  src/utils/logger.ts: New file — lightweight debug logger with
    setVerboseLogging() and debug() functions
  src/settings.ts: Added enableVerboseLogging to SmartHoleSettings interface,
    DEFAULT_SETTINGS, and Developer section toggle in settings tab
  src/main.ts: Import and initialize setVerboseLogging in onload() and
    saveSettings(), added enableVerboseLogging to extractSettings()
  src/llm/LLMService.ts: "Added 6 debug() calls: processMessage entry, tool loop
    iteration, tool loop exit, tool execution success, tool execution failure"
  src/llm/AnthropicProvider.ts: "Added 3 debug() calls: before API call, after response, on retry"
  src/processor/MessageProcessor.ts: Added 1 debug() call for tools used summary after processing
log:
  - >-
    Research complete. Key findings:

    - settings.ts: SmartHoleSettings interface at line 7, DEFAULT_SETTINGS at
    line 59, SmartHoleSettingTab.display() at line 123, last section is "Version
    Control" at line 444

    - main.ts: onload() at line 31, loadSettings() at line 158, saveSettings()
    at line 164, extractSettings() at line 171

    - LLMService.ts: processMessage() at line 129, executeToolCalls() at line
    423, executeToolCall() at line 443, already has console.warn for max_tokens
    at line 205

    - AnthropicProvider.ts: sendMessage() at line 63, retry loop at line 78

    - MessageProcessor.ts: processWithRetry() at line 338, toolsUsed extraction
    at line 445

    - src/utils/ has time.ts (no index.ts barrel file, imports are direct path)

    - No existing logger utility


    Plan:

    1. Create src/utils/logger.ts with setVerboseLogging() and debug()

    2. Add enableVerboseLogging to SmartHoleSettings, DEFAULT_SETTINGS, and
    extractSettings()

    3. Add Developer section with toggle in settings tab

    4. Add debug() calls to LLMService.ts

    5. Add debug() calls to AnthropicProvider.ts  

    6. Add debug() call to MessageProcessor.ts

    7. Initialize logger in main.ts onload() and saveSettings()
  - Implemented verbose debug logging toggle for LLM and tool execution. Added
    enableVerboseLogging setting (default false) with a Developer section toggle
    in settings UI. Created a lightweight logger utility (src/utils/logger.ts)
    with setVerboseLogging() and debug() functions. Added ~6 debug() calls to
    LLMService.ts (processMessage entry, tool loop iterations, tool loop exit,
    tool execution success/failure), ~3 debug() calls to AnthropicProvider.ts
    (before API call, after response, on retry), and 1 debug() call to
    MessageProcessor.ts (tools used summary). Logger is initialized in main.ts
    onload() and updated in saveSettings() for immediate effect without restart.
    The existing console.warn for max_tokens truncation in LLMService.ts is
    preserved and not duplicated.
schema: v1.0
childrenIds: []
created: 2026-02-06T02:49:37.820Z
updated: 2026-02-06T02:49:37.820Z
---

## Problem

The LLM service layer (`LLMService.ts`, `AnthropicProvider.ts`) and tool execution have zero logging. When issues occur (like the max_tokens truncation bug), there is no diagnostic output to understand what happened. The user needs a way to enable verbose logging from the Electron dev console to troubleshoot agent behavior.

### Current State

- `LLMService.ts`: No `console.log` or `console.debug` calls at all
- `AnthropicProvider.ts`: No logging at all
- `MessageProcessor.ts`: Has some `console.log`/`console.error` but no tool-level detail
- No logging abstraction exists — all current logging is bare `console.log`/`console.error`
- No `enableVerboseLogging` setting exists

## Solution

Add a `enableVerboseLogging` setting and light `console.debug` logging to the critical code paths. When disabled (the default), no debug output is produced. When enabled, key events are logged to the dev console.

### 1. Add setting (src/settings.ts)

Add to `SmartHoleSettings` interface:
```typescript
/** Whether to enable verbose debug logging in the dev console */
enableVerboseLogging: boolean;
```

Default: `false`

Add a toggle in `SmartHoleSettingTab.display()` under a new "Developer" section heading at the bottom of the settings page.

### 2. Add a lightweight logger utility (src/utils/logger.ts)

Create a simple logger that checks `settings.enableVerboseLogging` before logging. This avoids passing settings through every function — instead, use a module-level reference pattern:

```typescript
let verbose = false;

export function setVerboseLogging(enabled: boolean): void {
  verbose = enabled;
}

export function debug(prefix: string, message: string, ...data: unknown[]): void {
  if (!verbose) return;
  console.debug(`[${prefix}] ${message}`, ...data);
}
```

The plugin's `onload()` calls `setVerboseLogging(this.settings.enableVerboseLogging)` at startup and whenever settings change.

### 3. Add logging to key code paths

Add `debug()` calls to these specific points (keep it light — only the high-value diagnostic points):

**LLMService.ts** — `processMessage()`:
- On entry: log user message (truncated to 100 chars) and number of registered tools
- On each tool loop iteration: log iteration number, stop reason, tool calls being executed (names only)
- On tool loop exit: log final stop reason, total iterations, and whether any tool_use blocks were in the final response
- On each tool execution: log tool name, success/error status, and result length

**AnthropicProvider.ts** — `sendMessage()`:
- Before API call: log model, message count, and whether tools are included
- After API call: log stop reason, output tokens used, and number of content blocks
- On retry: log attempt number and delay

**MessageProcessor.ts** — `processWithRetry()`:
- Log tools used summary at the end of processing

### 4. Initialize in main.ts

In `onload()`, after loading settings:
```typescript
setVerboseLogging(this.settings.enableVerboseLogging);
```

Also update `saveSettings()` to call `setVerboseLogging()` so toggling the setting takes effect immediately without restart.

### Files to Modify

| File | Change |
|------|--------|
| `src/settings.ts` | Add `enableVerboseLogging` to interface, default, and settings tab |
| `src/utils/logger.ts` | New file — lightweight debug logger (~15 lines) |
| `src/llm/LLMService.ts` | Add ~6 `debug()` calls in `processMessage()` and `executeToolCall()` |
| `src/llm/AnthropicProvider.ts` | Add ~3 `debug()` calls in `sendMessage()` |
| `src/processor/MessageProcessor.ts` | Add ~1 `debug()` call for tools used summary |
| `src/main.ts` | Initialize logger from settings, update on settings change |

## Acceptance Criteria

- [ ] `enableVerboseLogging` setting exists, defaults to `false`, has a toggle in settings
- [ ] When disabled: zero `console.debug` output from the logging calls
- [ ] When enabled: dev console shows key LLM events (tool loop iterations, stop reasons, tool names executed, token usage)
- [ ] Toggling the setting takes effect immediately without plugin restart
- [ ] No sensitive data is logged (no API keys, no full message content — truncate or summarize)
- [ ] Quality checks pass: `mise run quality`
- [ ] Build succeeds: `mise run build`

## Out of Scope

- Replacing existing `console.log`/`console.error` calls with the new logger (leave those as-is)
- File-based logging or log persistence
- Log levels beyond debug (the existing `console.error` calls handle errors already)
- Logging in WebSocket, inbox, or conversation manager (keep scope to LLM/tool layer for now)