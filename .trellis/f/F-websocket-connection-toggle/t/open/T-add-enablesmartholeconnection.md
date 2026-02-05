---
id: T-add-enablesmartholeconnection
title: Add enableSmartHoleConnection setting and UI toggle
status: open
priority: medium
parent: F-websocket-connection-toggle
prerequisites: []
affectedFiles: {}
log: []
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