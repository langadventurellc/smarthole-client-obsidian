---
id: T-add-setsmartholeconnectionenab
title: Add setSmartHoleConnectionEnabled method and update status bar handling
status: done
priority: medium
parent: F-websocket-connection-toggle
prerequisites:
  - T-add-disabled-status-to
affectedFiles:
  src/main.ts: Added enableSmartHoleConnection extraction in extractSettings(),
    added setSmartHoleConnectionEnabled() method for dynamic connection control,
    modified onload() to conditionally start connection based on
    enableSmartHoleConnection setting
log:
  - Implemented the setSmartHoleConnectionEnabled method and updated status bar
    handling in src/main.ts. Added extraction logic for
    enableSmartHoleConnection boolean in extractSettings(), added the
    setSmartHoleConnectionEnabled() method that dynamically enables/disables
    WebSocket connection with proper reconnection handling, and modified
    onload() to conditionally start connection based on the setting value. All
    quality checks pass.
schema: v1.0
childrenIds: []
created: 2026-02-05T06:03:40.980Z
updated: 2026-02-05T06:03:40.980Z
---

## Summary
Add a public method on the plugin class to dynamically enable/disable the WebSocket connection, and update status bar rendering to handle the new "disabled" status.

## Technical Details

### 1. Add extraction logic for `enableSmartHoleConnection` in `extractSettings()` in `src/main.ts`
Add to the extraction logic:
```typescript
if (typeof d.enableSmartHoleConnection === "boolean")
  settings.enableSmartHoleConnection = d.enableSmartHoleConnection;
```

### 2. Add `setSmartHoleConnectionEnabled()` method to `SmartHolePlugin` class in `src/main.ts`
```typescript
/**
 * Enable or disable the SmartHole WebSocket connection.
 * Called from settings toggle to dynamically control connection.
 */
setSmartHoleConnectionEnabled(enabled: boolean): void {
  if (enabled) {
    this.connection?.enableReconnection();
    this.connection?.connect();
    // Status will be updated by onStateChange callback
  } else {
    // Note: disconnect() already calls disableReconnection() internally,
    // but we call it explicitly for clarity and defensive coding
    this.connection?.disableReconnection();
    this.connection?.disconnect();
    this.updateStatusBar("disabled");
  }
}
```

**Implementation Note:** The `SmartHoleConnection.disconnect()` method already calls `disableReconnection()` internally (see line 148 in SmartHoleConnection.ts). Calling it explicitly before `disconnect()` is redundant but harmless, and makes the intent clearer. When toggling ON, `enableReconnection()` must be called before `connect()` to re-enable auto-reconnect after any prior `disconnect()` call.

### 3. Update status bar in `updateStatusBar()` in `src/main.ts`
Add entry for "disabled" status:
```typescript
const statusText: Record<ConnectionStatus, string> = {
  disconnected: "SmartHole: Disconnected",
  connecting: "SmartHole: Connecting...",
  connected: "SmartHole: Connected",
  error: "SmartHole: Error",
  disabled: "SmartHole: Disabled",
};
```

### 4. Modify `onload()` in `src/main.ts`
Make connection initialization conditional on the setting:
```typescript
// Enable reconnection and initiate connection (if enabled in settings)
if (this.settings.enableSmartHoleConnection) {
  this.connection.enableReconnection();
  this.connection.connect();
} else {
  this.updateStatusBar("disabled");
}
```

## Acceptance Criteria
- [ ] `extractSettings()` properly extracts `enableSmartHoleConnection` boolean
- [ ] `setSmartHoleConnectionEnabled(true)` enables reconnection and initiates connection
- [ ] `setSmartHoleConnectionEnabled(false)` disables reconnection, disconnects, and updates status bar to "disabled"
- [ ] Status bar shows "SmartHole: Disabled" when toggle is OFF
- [ ] Plugin conditionally starts connection based on setting value during `onload()`
- [ ] No Obsidian restart required for setting changes to take effect

## Dependencies
- T-add-disabled-status-to (adds "disabled" to ConnectionStatus type)

## Files to Modify
- `src/main.ts`