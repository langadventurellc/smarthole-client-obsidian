---
id: F-websocket-connection-manager
title: WebSocket Connection Manager & Protocol Implementation
status: done
priority: high
parent: E-smarthole-websocket
prerequisites: []
affectedFiles:
  src/websocket/types.ts: Created all protocol type definitions including
    RegistrationPayload, RegistrationMessage, RegistrationResponseMessage with
    success/failure variants, RegistrationErrorCode, RoutedMessage with
    MessageMetadata, ResponseMessage with ack/reject/notification payloads,
    union types (OutgoingMessage, IncomingMessage), and type guard functions for
    runtime type discrimination
  src/websocket/index.ts: Created public exports file with organized exports for
    all types and type guards, grouped by category (outgoing messages, incoming
    messages, union types/utilities, type guards); Added exports for
    SmartHoleConnection class and its associated types
    (SmartHoleConnectionOptions, SmartHoleConnectionCallbacks,
    NotificationOptions, RegistrationError)
  src/websocket/SmartHoleConnection.ts: "Created SmartHoleConnection class with:
    constructor accepting SmartHoleConnectionOptions (name, description,
    version, capabilities), connect/disconnect methods for WebSocket lifecycle,
    automatic registration on connection open, message parsing with validation
    using type guards from types.ts, callback system (onStateChange,
    onRegistrationResult, onMessage, onError), response methods (sendAck,
    sendReject, sendNotification), and proper error handling throughout"
log:
  - "Auto-completed: All child tasks are complete"
schema: v1.0
childrenIds:
  - T-define-websocket-protocol
  - T-implement-smartholeconnection
created: 2026-02-03T05:13:28.179Z
updated: 2026-02-03T05:13:28.179Z
---

# WebSocket Connection Manager & Protocol Implementation

## Purpose

Implement the core WebSocket connection class that connects to SmartHole's server and implements the complete protocol specification for registration, message handling, and responses.

## Scope

### What's Included

1. **SmartHoleConnection Class** (`src/websocket/SmartHoleConnection.ts`)
   - Connect to `ws://127.0.0.1:9473` using native browser WebSocket API
   - Handle WebSocket lifecycle events (open, close, error, message)
   - Expose connection state via observable/callback pattern
   - Method for clean disconnect

2. **TypeScript Protocol Types** (`src/websocket/types.ts`)
   - All message type interfaces matching the protocol spec:
     - `RegistrationMessage` and `RegistrationPayload` (including optional `capabilities` field)
     - `RegistrationResponse` and `RegistrationResponsePayload` (success/failure with error codes)
     - `RoutedMessage` and `RoutedMessagePayload` with metadata
     - `ResponseMessage` with ack/reject/notification variants
   - Union type for all incoming/outgoing messages
   - Type guards for message discrimination

3. **Registration Implementation**
   - Send registration message immediately after WebSocket opens
   - Include name, description, version from settings/config
   - Optional: capabilities array (not used in MVP but type should support it)
   - Handle `registration_response` success/failure
   - Emit registration status for UI feedback

4. **Message Handling**
   - Receive `message` type with id, text, timestamp, metadata
   - Parse and validate incoming JSON messages
   - Event emitter or callback pattern for incoming messages
   - Pass messages to subscribers for processing

5. **Response Methods**
   - `sendAck(messageId: string)` - Send acknowledgment
   - `sendReject(messageId: string, reason?: string)` - Send rejection
   - `sendNotification(messageId: string, options: NotificationOptions)` - Send notification

### What's NOT Included (handled by F-connection-lifecycle)

- Automatic reconnection logic
- Exponential backoff
- Plugin lifecycle integration (onload/onunload)
- Status bar updates

## Technical Details

### File Structure
```
src/websocket/
├── SmartHoleConnection.ts  # Main connection class
├── types.ts                # Protocol type definitions
└── index.ts                # Public exports
```

### Connection URL
`ws://127.0.0.1:9473` (hardcoded - SmartHole only accepts localhost)

### Registration Payload
```typescript
{
  type: "registration",
  payload: {
    name: string,           // From settings.clientName
    description: string,    // From settings.routingDescription
    version: string,        // From manifest.json (1.0.0)
    capabilities?: string[] // Optional, not used in MVP
  }
}
```

### Registration Error Codes
The `registration_response` may include these error codes on failure:
- `INVALID_NAME` - Name doesn't meet validation rules
- `INVALID_DESCRIPTION` - Description is empty or exceeds 1024 characters
- `DUPLICATE_NAME` - Another client with this name is already connected
- `ALREADY_REGISTERED` - This WebSocket connection already registered a client
- `VALIDATION_ERROR` - General validation failure

### Event/Callback Pattern
The connection class should expose events or callbacks for:
- `onStateChange(state: ConnectionStatus)` - Connection state changes
- `onRegistrationResult(success: boolean, error?: string)` - Registration outcome
- `onMessage(message: RoutedMessage)` - Incoming routed messages
- `onError(error: Error)` - Connection errors

## Acceptance Criteria

- [ ] SmartHoleConnection class can establish WebSocket connection
- [ ] Registration message sent automatically on connection open
- [ ] Registration response handled correctly (success and failure cases)
- [ ] Incoming routed messages are parsed and emitted to subscribers
- [ ] Response methods (ack, reject, notification) send correctly formatted messages
- [ ] JSON parsing validates message structure
- [ ] Malformed messages are logged but don't crash the connection
- [ ] Clean disconnect method closes WebSocket gracefully
- [ ] All protocol types match specification in protocol-reference.md
- [ ] Type guards correctly discriminate message types

## Dependencies

None - this is the foundational feature.

## References

- Protocol specification: `/reference-docs/smarthole-client-docs/protocol-reference.md`
- Plugin version: 1.0.0 (from manifest.json)