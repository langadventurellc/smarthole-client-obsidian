---
id: F-connection-lifecycle
title: Connection Lifecycle & Automatic Reconnection
status: open
priority: high
parent: E-smarthole-websocket
prerequisites:
  - F-websocket-connection-manager
affectedFiles: {}
log: []
schema: v1.0
childrenIds: []
created: 2026-02-03T05:13:46.583Z
updated: 2026-02-03T05:13:46.583Z
---

# Connection Lifecycle & Automatic Reconnection

## Purpose

Implement automatic reconnection with exponential backoff and integrate the WebSocket connection into the plugin lifecycle, ensuring the plugin gracefully handles disconnections and SmartHole not running.

## Scope

### What's Included

1. **Reconnection Manager** 
   - Exponential backoff: 1s → 2s → 4s → 8s → 16s → 30s (capped at 30s)
   - **Retry indefinitely** - no maximum attempt limit (per living-spec requirement)
   - Reset backoff counter on successful connection AND successful registration
   - Track reconnection state and attempt count

2. **Plugin Integration** (updates to `src/main.ts`)
   - Start connection on plugin load (`onload`)
   - Pass settings (clientName, routingDescription) to connection
   - Clean disconnect on plugin unload (`onunload`)
   - Stop reconnection attempts when plugin is disabled
   - Subscribe to connection state changes

3. **Status Bar Integration**
   - Update status bar based on connection state
   - Use existing `updateStatusBar(status: ConnectionStatus)` method
   - States: disconnected, connecting, connected, error

4. **Graceful Degradation**
   - Plugin remains functional when SmartHole is not running
   - No crashes or error spam in console
   - Quietly retry in background
   - User can see "Disconnected" status but plugin works otherwise

5. **State Machine**
   - Clear state transitions: disconnected → connecting → connected → disconnected
   - Handle edge cases (rapid disconnect/reconnect, connection during reconnect attempt)
   - Prevent duplicate connection attempts

### What's NOT Included (handled by F-websocket-connection-manager)

- Core WebSocket connection logic
- Protocol message types
- Registration/message/response handling

## Technical Details

### Backoff Algorithm
```typescript
const BASE_DELAY = 1000; // 1 second
const MAX_DELAY = 30000; // 30 seconds

function calculateDelay(attempts: number): number {
  return Math.min(BASE_DELAY * Math.pow(2, attempts), MAX_DELAY);
}
// Produces: 1s, 2s, 4s, 8s, 16s, 30s, 30s, 30s...
```

### No Maximum Attempts
Per the living-spec: "retry every 30 seconds" indefinitely when SmartHole is unavailable. Users who leave Obsidian running should have the plugin automatically connect whenever SmartHole becomes available.

### Reset Conditions
Backoff counter resets to 0 when:
- WebSocket connection opens successfully AND
- Registration response indicates success

### Plugin Lifecycle
```typescript
// In onload():
// 1. Create SmartHoleConnection instance
// 2. Set up state change listener for status bar
// 3. Set up message listener for future processing
// 4. Initiate first connection attempt

// In onunload():
// 1. Cancel any pending reconnection timeout
// 2. Disconnect WebSocket cleanly
// 3. Clear all listeners
```

## Acceptance Criteria

- [ ] Plugin connects to SmartHole automatically on load
- [ ] Plugin disconnects cleanly on unload
- [ ] Reconnection uses exponential backoff (1s → 30s cap)
- [ ] Reconnection retries indefinitely (no max attempts)
- [ ] Backoff resets on successful connection and registration
- [ ] Status bar updates reflect current connection state
- [ ] Plugin remains stable when SmartHole is not running
- [ ] No console error spam during disconnected state
- [ ] Disabling plugin stops reconnection attempts
- [ ] Re-enabling plugin starts fresh connection attempt
- [ ] Rapid disconnect/reconnect doesn't create duplicate connections

## Dependencies

- **F-websocket-connection-manager**: Requires the core SmartHoleConnection class

## References

- Living spec connection behavior: `/docs/living-spec.md` (Connection Behavior section)
- Protocol reconnection guidance: `/reference-docs/smarthole-client-docs/protocol-reference.md` (Reconnection section)