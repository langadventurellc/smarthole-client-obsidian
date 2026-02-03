---
id: T-implement-status-bar
title: Implement status bar indicator with connection states
status: open
priority: high
parent: F-plugin-core-with-settings-and
prerequisites:
  - T-implement-types-settings
affectedFiles: {}
log: []
schema: v1.0
childrenIds: []
created: 2026-02-03T04:46:05.827Z
updated: 2026-02-03T04:46:05.827Z
---

# Implement Status Bar Indicator with Connection States

## Purpose

Add a status bar item that displays the SmartHole connection status. This provides visual feedback to users about whether the plugin is connected to SmartHole.

## Deliverables

### 1. Add Status Bar Infrastructure to Main Plugin

Update `src/main.ts` to:

1. Add a private property to store the status bar element:
   ```typescript
   private statusBarEl: HTMLElement;
   ```

2. Initialize status bar in `onload()`:
   ```typescript
   this.statusBarEl = this.addStatusBarItem();
   this.updateStatusBar('disconnected');
   ```

3. Implement `updateStatusBar(status: ConnectionStatus)` method:
   ```typescript
   updateStatusBar(status: ConnectionStatus): void {
     const statusText: Record<ConnectionStatus, string> = {
       disconnected: 'SmartHole: Disconnected',
       connecting: 'SmartHole: Connecting...',
       connected: 'SmartHole: Connected',
       error: 'SmartHole: Error',
     };
     this.statusBarEl.setText(statusText[status]);
   }
   ```

4. Add click handler to show connection details:
   ```typescript
   this.statusBarEl.addEventListener('click', () => {
     // MVP: Log to console (SmartHole notifications not yet implemented)
     console.log('SmartHole connection status clicked');
   });
   ```

### 2. Connection Status Type

Import `ConnectionStatus` from `./types` (already defined in previous task).

### 3. Clean Unload

The status bar element is automatically cleaned up by Obsidian when the plugin unloads (it's added via `addStatusBarItem()`), so no explicit cleanup is needed. However, ensure `onunload()` doesn't have any issues.

## Acceptance Criteria

- [ ] Status bar item appears in Obsidian's status bar
- [ ] Status bar shows "SmartHole: Disconnected" on initial load
- [ ] `updateStatusBar()` method exists and correctly updates text for all four states:
  - [ ] `disconnected` → "SmartHole: Disconnected"
  - [ ] `connecting` → "SmartHole: Connecting..."
  - [ ] `connected` → "SmartHole: Connected"
  - [ ] `error` → "SmartHole: Error"
- [ ] Status bar responds to click (logs to console for MVP)
- [ ] Plugin unloads cleanly without errors
- [ ] `mise run quality` passes
- [ ] `mise run build` succeeds

## Technical Notes

- `addStatusBarItem()` returns an `HTMLElement` that can be manipulated
- Use `setText()` method to update the status bar text
- The status bar element is automatically removed when the plugin unloads
- For MVP, click handler just logs - actual connection details will come with WebSocket implementation

## Files to Modify

- Modify: `src/main.ts` (add status bar item, updateStatusBar method, click handler)
- Import: `ConnectionStatus` from `./types`