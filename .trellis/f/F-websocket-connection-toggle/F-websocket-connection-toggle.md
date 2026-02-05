---
id: F-websocket-connection-toggle
title: WebSocket Connection Toggle Setting
status: in-progress
priority: medium
parent: none
prerequisites: []
affectedFiles: {}
log: []
schema: v1.0
childrenIds:
  - T-add-disabled-status-to
  - T-add-enablesmartholeconnection
  - T-add-setsmartholeconnectionenab
created: 2026-02-05T06:01:23.639Z
updated: 2026-02-05T06:01:23.639Z
---

## Purpose

Add a settings toggle that allows users to dynamically enable/disable WebSocket connection attempts to the SmartHole desktop application. When disabled, the plugin will stop attempting to connect and will not ping the desktop app every 30 seconds. The toggle should take effect immediately without requiring an Obsidian restart.

## Key Components to Implement

### 1. Settings Layer (`src/settings.ts`)
- Add `enableSmartHoleConnection: boolean` to `SmartHoleSettings` interface
- Add default value `true` to `DEFAULT_SETTINGS` for backward compatibility
- Add toggle UI control in `SmartHoleSettingTab.display()` method
- Wire toggle's `onChange` to dynamically connect/disconnect the WebSocket

### 2. Settings Extraction (`src/main.ts`)
- Add extraction logic for `enableSmartHoleConnection` in `extractSettings()` function

### 3. Plugin Initialization (`src/main.ts`)
- Modify `onload()` to conditionally start connection based on setting value
- Expose connection instance to settings tab for dynamic control

### 4. Status Bar Enhancement (`src/main.ts` and potentially `src/types.ts`)
- Add distinct "Disabled" status when user intentionally disables connection
- Differentiate from "Disconnected" (connection failed/lost) vs "Disabled" (user choice)

## Acceptance Criteria

- [ ] New boolean setting `enableSmartHoleConnection` exists with default value `true`
- [ ] Toggle appears in settings UI with clear name and description
- [ ] Toggling OFF immediately disconnects WebSocket and stops all reconnection attempts
- [ ] Toggling ON immediately initiates connection to SmartHole
- [ ] Status bar shows "Disabled" when toggle is OFF (distinct from "Disconnected")
- [ ] Status bar shows appropriate connected/disconnected status when toggle is ON
- [ ] Setting persists across Obsidian restarts
- [ ] Existing functionality (ChatView, direct messages) continues to work regardless of toggle state
- [ ] No restart required for setting changes to take effect

## Technical Requirements

### Settings Access Pattern
The settings tab needs access to the connection instance. Options:
1. Make `connection` a public property on the plugin class
2. Add a method like `setSmartHoleEnabled(enabled: boolean)` on the plugin class that the settings tab calls

Recommended: Add a method on the plugin class to encapsulate the connect/disconnect logic, keeping the connection property private.

### Status Bar States
Current `ConnectionStatus` type in `src/types.ts` likely needs extension:
- Add `"disabled"` status value
- Update status bar rendering to handle this new state

### WebSocket Connection Manager
The `SmartHoleConnection` class already has `enableReconnection()` and `disableReconnection()` methods. The implementation should:
- Call `disableReconnection()` then `disconnect()` when toggled OFF
- Call `enableReconnection()` then `connect()` when toggled ON

## Implementation Guidance

### Dynamic Toggle Handler Pattern
```typescript
// In settings tab onChange:
.onChange(async (value) => {
  this.plugin.settings.enableSmartHoleConnection = value;
  await this.plugin.saveSettings();
  this.plugin.setSmartHoleConnectionEnabled(value);
})

// In main plugin class:
setSmartHoleConnectionEnabled(enabled: boolean): void {
  if (enabled) {
    this.connection?.enableReconnection();
    this.connection?.connect();
  } else {
    this.connection?.disableReconnection();
    this.connection?.disconnect();
  }
  // Update status bar appropriately
}
```

### Status Bar Update
When disabled, force status to "disabled" regardless of WebSocket state. When enabled, let the WebSocket connection manager drive the status as normal.

## Testing Requirements

- Verify toggle appears correctly in settings
- Verify toggling OFF stops connection attempts immediately
- Verify toggling ON initiates connection immediately
- Verify status bar shows correct state for enabled/disabled
- Verify setting persists after Obsidian restart
- Verify ChatView still works when WebSocket is disabled

## Dependencies

None - this is a standalone feature.

## Files to Modify

- `src/settings.ts` - Add setting, UI, and dynamic toggle handler
- `src/main.ts` - Add extraction logic, conditional init, expose control method
- `src/types.ts` - Add "disabled" to ConnectionStatus type