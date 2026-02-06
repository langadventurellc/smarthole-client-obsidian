---
id: T-add-verbose-debug-logging
title: Add verbose debug logging toggle for LLM and tool execution
status: open
priority: medium
parent: none
prerequisites:
  - T-fix-max-tokens-truncation
affectedFiles: {}
log: []
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