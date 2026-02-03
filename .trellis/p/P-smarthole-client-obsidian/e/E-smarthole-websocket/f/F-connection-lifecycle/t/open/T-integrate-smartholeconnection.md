---
id: T-integrate-smartholeconnection
title: Integrate SmartHoleConnection into Plugin Lifecycle
status: open
priority: high
parent: F-connection-lifecycle
prerequisites:
  - T-implement-reconnection
affectedFiles: {}
log: []
schema: v1.0
childrenIds: []
created: 2026-02-03T05:37:48.543Z
updated: 2026-02-03T05:37:48.543Z
---

# Integrate SmartHoleConnection into Plugin Lifecycle

## Purpose

Wire up the `SmartHoleConnection` class to the Obsidian plugin lifecycle, connecting on load and disconnecting on unload, with status bar updates reflecting connection state.

## Scope

### Plugin onload() Updates

1. **Create SmartHoleConnection instance**
   ```typescript
   this.connection = new SmartHoleConnection({
     name: this.settings.clientName,
     description: this.settings.routingDescription,
     version: this.manifest.version,
   });
   ```

2. **Set up state change listener for status bar**
   ```typescript
   this.connection.onStateChange = (state) => {
     this.updateStatusBar(state);
   };
   ```

3. **Set up message listener** (placeholder for future processing)
   ```typescript
   this.connection.onMessage = (message) => {
     console.log('Received message:', message.payload.id);
     // Future: pass to LLM processing layer
   };
   ```

4. **Enable reconnection and initiate first connection**
   ```typescript
   this.connection.enableReconnection();
   this.connection.connect();
   ```

### Plugin onunload() Updates

1. **Disable reconnection** (stops any pending reconnect attempts)
2. **Disconnect WebSocket cleanly**
3. **Clear connection reference**

```typescript
async onunload() {
  if (this.connection) {
    this.connection.disableReconnection();
    this.connection.disconnect();
    this.connection = null;
  }
}
```

### Status Bar Integration

The existing `updateStatusBar(status: ConnectionStatus)` method already handles all states:
- `disconnected` → "SmartHole: Disconnected"
- `connecting` → "SmartHole: Connecting..."  
- `connected` → "SmartHole: Connected"
- `error` → "SmartHole: Error"

Just need to wire up the `onStateChange` callback.

### Graceful Degradation

- Plugin should remain functional when SmartHole is not running
- No crashes or error spam - reconnection manager handles quiet retries
- User sees "Disconnected" status but plugin works otherwise (settings accessible, etc.)

## Files to Modify

- `src/main.ts` - Add connection instance, lifecycle hooks, status bar wiring

## Acceptance Criteria

- [ ] Plugin connects to SmartHole automatically on load
- [ ] Plugin disconnects cleanly on unload
- [ ] Status bar updates reflect current connection state
- [ ] Plugin remains stable when SmartHole is not running
- [ ] No console error spam during disconnected state
- [ ] Disabling plugin stops reconnection attempts
- [ ] Re-enabling plugin starts fresh connection attempt