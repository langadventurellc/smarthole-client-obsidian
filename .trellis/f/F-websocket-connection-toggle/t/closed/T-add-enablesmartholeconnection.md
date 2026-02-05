---
id: T-add-enablesmartholeconnection
title: Add enableSmartHoleConnection setting and UI toggle
status: done
priority: medium
parent: F-websocket-connection-toggle
prerequisites: []
affectedFiles:
  src/settings.ts: Added enableSmartHoleConnection boolean to SmartHoleSettings
    interface, added default value true to DEFAULT_SETTINGS, added toggle UI
    control at top of display() method with name, description, and onChange
    handler that saves settings and conditionally calls
    setSmartHoleConnectionEnabled
log:
  - Added enableSmartHoleConnection setting to control WebSocket connection to
    SmartHole desktop app. The setting is added to the SmartHoleSettings
    interface with a JSDoc comment, defaults to true in DEFAULT_SETTINGS for
    backward compatibility, and includes a toggle UI at the top of the settings
    panel (before API Key). The toggle saves the setting on change and includes
    a conditional call to setSmartHoleConnectionEnabled (which will be added in
    task T-add-setsmartholeconnectionenab).
schema: v1.0
childrenIds: []
created: 2026-02-05T06:03:25.252Z
updated: 2026-02-05T06:03:25.252Z
---

## Summary
Add the `enableSmartHoleConnection` boolean setting to the settings interface, default settings, and create a toggle UI control in the settings tab.

## Technical Details

### 1. Update `SmartHoleSettings` interface in `src/settings.ts`
Add new property:
```typescript
/** Whether to enable WebSocket connection to SmartHole desktop app */
enableSmartHoleConnection: boolean;
```

### 2. Update `DEFAULT_SETTINGS` in `src/settings.ts`
Add default value `true` for backward compatibility with existing installations.

### 3. Add toggle UI in `SmartHoleSettingTab.display()` in `src/settings.ts`
Add a toggle control at the top of the settings (before API Key) using Obsidian's `Setting` component with `addToggle()`. The toggle should:
- Have a clear name like "Enable SmartHole Connection"
- Have a description explaining what it does: "Connect to SmartHole desktop app. When disabled, the plugin will not attempt to connect or ping the desktop app."
- Save the setting value on change
- Call `this.plugin.setSmartHoleConnectionEnabled(value)` to dynamically control the connection (this method will be added in a separate task)

## Acceptance Criteria
- [ ] `enableSmartHoleConnection: boolean` exists in `SmartHoleSettings` interface
- [ ] Default value is `true` in `DEFAULT_SETTINGS`
- [ ] Toggle appears in settings UI with clear name and description
- [ ] Toggle saves setting value when changed
- [ ] Toggle is positioned prominently (before API key setting)

## Files to Modify
- `src/settings.ts`