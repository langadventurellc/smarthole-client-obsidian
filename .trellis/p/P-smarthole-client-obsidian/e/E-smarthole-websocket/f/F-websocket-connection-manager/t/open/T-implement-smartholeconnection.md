---
id: T-implement-smartholeconnection
title: Implement SmartHoleConnection Class
status: open
priority: high
parent: F-websocket-connection-manager
prerequisites:
  - T-define-websocket-protocol
affectedFiles: {}
log: []
schema: v1.0
childrenIds: []
created: 2026-02-03T05:17:43.207Z
updated: 2026-02-03T05:17:43.207Z
---

# Implement SmartHoleConnection Class

## Purpose

Implement the core WebSocket connection class that connects to SmartHole's server and handles the complete protocol for registration, message handling, and responses.

## Scope

Create `src/websocket/SmartHoleConnection.ts` implementing:

### Constructor

```typescript
constructor(options: SmartHoleConnectionOptions)
```

Options include:
- `name: string` - Client name for registration
- `description: string` - Routing description
- `version: string` - Client version (default: "1.0.0")
- `capabilities?: string[]` - Optional capabilities array

### Connection Methods

1. **connect(): void**
   - Creates WebSocket connection to `ws://127.0.0.1:9473`
   - Sets up event handlers for open, close, error, message
   - Emits state change to "connecting"

2. **disconnect(): void**
   - Gracefully closes WebSocket connection
   - Cleans up event handlers
   - Emits state change to "disconnected"

### Registration (automatic on connect)

- Send registration message immediately when WebSocket opens
- Handle `registration_response`:
  - On success: emit registration success, change state to "connected"
  - On failure: emit registration error with code and message, change state to "error"

### Message Handling

- Parse incoming JSON messages
- Validate message structure (log and ignore malformed messages)
- Use type guards to discriminate message types
- Emit routed messages to subscribers via callback

### Response Methods

1. **sendAck(messageId: string): void**
   - Send ack response for the given message ID

2. **sendReject(messageId: string, reason?: string): void**
   - Send reject response with optional reason

3. **sendNotification(messageId: string, options: NotificationOptions): void**
   - Options: `{ title?: string, body?: string, priority?: "low" | "normal" | "high" }`
   - Send notification response

### Event/Callback System

Expose callbacks for external code to subscribe:
- `onStateChange: (state: ConnectionStatus) => void`
- `onRegistrationResult: (success: boolean, error?: { code: string, message: string }) => void`
- `onMessage: (message: RoutedMessage) => void`
- `onError: (error: Error) => void`

Implementation options:
- Simple callback properties that can be set
- Or a small event emitter pattern

### State Management

- Track current `ConnectionStatus` (from `src/types.ts`)
- Expose `getState(): ConnectionStatus` method
- Emit state changes through `onStateChange` callback

### Error Handling

- JSON parse errors: log to console, do not crash
- Unknown message types: log to console, ignore
- WebSocket errors: emit via onError callback, change state to "error"

## Files to Create/Modify

- `src/websocket/SmartHoleConnection.ts` - Main connection class
- `src/websocket/index.ts` - Add SmartHoleConnection export

## Acceptance Criteria

- [ ] SmartHoleConnection can establish WebSocket connection to localhost:9473
- [ ] Registration message sent automatically on connection open
- [ ] Registration success/failure handled correctly with appropriate callbacks
- [ ] Incoming routed messages parsed and emitted to subscribers
- [ ] sendAck() sends correctly formatted ack response
- [ ] sendReject() sends correctly formatted reject response with optional reason
- [ ] sendNotification() sends correctly formatted notification response
- [ ] Malformed JSON messages logged but don't crash the connection
- [ ] Unknown message types logged but don't crash the connection
- [ ] disconnect() closes WebSocket cleanly
- [ ] State changes emit via onStateChange callback
- [ ] All methods handle WebSocket not being open gracefully

## Technical Notes

- Use native browser WebSocket API (available in Electron environment)
- Connection URL is hardcoded to `ws://127.0.0.1:9473` (SmartHole security requirement)
- This class does NOT handle reconnection logic (that's in F-connection-lifecycle)
- This class does NOT integrate with plugin lifecycle (that's in F-connection-lifecycle)

## References

- Protocol specification: `/reference-docs/smarthole-client-docs/protocol-reference.md`
- Existing types: `src/types.ts` (ConnectionStatus)