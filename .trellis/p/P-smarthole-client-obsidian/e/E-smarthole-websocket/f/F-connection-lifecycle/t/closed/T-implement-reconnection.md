---
id: T-implement-reconnection
title: Implement Reconnection Manager with Exponential Backoff
status: done
priority: high
parent: F-connection-lifecycle
prerequisites: []
affectedFiles:
  src/websocket/SmartHoleConnection.ts: "Added reconnection manager with
    exponential backoff: constants for base/max delay (1s/30s), reconnection
    state variables, public API methods (enableReconnection,
    disableReconnection, isReconnecting, getReconnectAttempts), private helper
    methods (calculateReconnectDelay, cancelPendingReconnect, scheduleReconnect,
    resetReconnectState). Modified disconnect() to disable reconnection, onclose
    to trigger reconnection, and registration success to reset backoff."
log:
  - >-
    Completed research phase:

    - Read SmartHoleConnection.ts - Core WebSocket connection class (307 lines)

    - Read types.ts - ConnectionStatus type definition

    - Read websocket/types.ts - Protocol message types and type guards

    - Read main.ts - Plugin lifecycle (shows how connection will be used)

    - Read living-spec.md - Confirms "retry every 30 seconds" on failure,
    indefinite retries


    Key findings:

    1. SmartHoleConnection already handles basic connection, registration, and
    state management

    2. ConnectionStatus has 4 states: "disconnected", "connecting", "connected",
    "error"

    3. Current disconnect() clears event handlers before closing - we need to
    track intentional disconnects

    4. Registration success/failure already triggers callbacks - good place to
    reset backoff

    5. onclose handler already detects unintentional disconnects (when this.ws
    still exists)


    Implementation plan:

    - Add reconnection state variables (enabled, attempts, timeout ID)

    - Add backoff calculation function (1s -> 30s cap, exponential)

    - Modify disconnect() to disable reconnection

    - Modify onclose handler to trigger reconnection when enabled

    - Modify registration success to reset backoff counter

    - Add public API: enableReconnection(), disableReconnection(),
    isReconnecting(), getReconnectAttempts()
  - Implemented automatic reconnection with exponential backoff in
    SmartHoleConnection class. Added reconnection state tracking (enabled flag,
    attempt counter, timeout ID), backoff calculation using exponential
    algorithm (1s -> 2s -> 4s -> 8s -> 16s -> 30s cap), and public API methods
    (enableReconnection, disableReconnection, isReconnecting,
    getReconnectAttempts). Modified disconnect() to also disable reconnection,
    and onclose handler to schedule reconnection when enabled. Registration
    success resets backoff counter. Minimal logging with one message per
    reconnection attempt.
schema: v1.0
childrenIds: []
created: 2026-02-03T05:37:34.638Z
updated: 2026-02-03T05:37:34.638Z
---

# Implement Reconnection Manager with Exponential Backoff

## Purpose

Add reconnection logic to `SmartHoleConnection` or create a wrapper that manages automatic reconnection with exponential backoff when the WebSocket connection is lost or fails to connect.

## Scope

### Implementation Approach

Extend `SmartHoleConnection` with reconnection capabilities:

1. **Backoff Algorithm**
   ```typescript
   const BASE_DELAY = 1000; // 1 second
   const MAX_DELAY = 30000; // 30 seconds
   
   function calculateDelay(attempts: number): number {
     return Math.min(BASE_DELAY * Math.pow(2, attempts), MAX_DELAY);
   }
   // Produces: 1s, 2s, 4s, 8s, 16s, 30s, 30s, 30s...
   ```

2. **Reconnection State Tracking**
   - Track reconnection attempt count
   - Track pending reconnection timeout ID (for cancellation)
   - Track whether reconnection is enabled/disabled

3. **Reset Conditions**
   - Reset backoff counter to 0 when:
     - WebSocket connection opens successfully AND
     - Registration response indicates success

4. **Reconnection Triggers**
   - WebSocket `onclose` event (when not intentionally disconnected)
   - WebSocket `onerror` followed by close
   - Registration failure (should retry connection)

5. **API Additions to SmartHoleConnection**
   - `enableReconnection()` - Start/resume automatic reconnection
   - `disableReconnection()` - Stop reconnection attempts, cancel pending timeout
   - `isReconnecting(): boolean` - Check if currently waiting to reconnect
   - `getReconnectAttempts(): number` - Get current attempt count

### Behavior Notes

- **Retry indefinitely** - no maximum attempt limit (per living-spec requirement)
- After successful connection AND registration, reset attempt counter
- When `disableReconnection()` is called, cancel any pending timeout
- When manually calling `disconnect()`, should also disable reconnection
- Logging should be minimal to avoid console spam (one log per attempt, not repeated warnings)

## Files to Modify

- `src/websocket/SmartHoleConnection.ts` - Add reconnection logic

## Acceptance Criteria

- [ ] Exponential backoff follows pattern: 1s, 2s, 4s, 8s, 16s, 30s (capped)
- [ ] Reconnection retries indefinitely (no max attempts)
- [ ] Backoff resets on successful connection + registration
- [ ] `disableReconnection()` cancels pending reconnection
- [ ] `disconnect()` also disables reconnection
- [ ] No console spam during reconnection attempts
- [ ] Connection state properly reflects reconnecting status