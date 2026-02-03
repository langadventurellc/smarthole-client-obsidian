---
id: E-smarthole-websocket
title: SmartHole WebSocket Integration
status: in-progress
priority: medium
parent: P-smarthole-client-obsidian
prerequisites:
  - E-plugin-foundation-and-settings
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
log: []
schema: v1.0
childrenIds:
  - F-connection-lifecycle
  - F-websocket-connection-manager
created: 2026-02-03T03:40:01.797Z
updated: 2026-02-03T03:40:01.797Z
---

# SmartHole WebSocket Integration

## Purpose and Goals

Implement the WebSocket connection manager that connects to SmartHole's server, handles the registration protocol, manages reconnection with exponential backoff, and processes incoming/outgoing messages according to the SmartHole protocol specification.

## Major Components and Deliverables

### 1. WebSocket Connection Manager
- `src/websocket/SmartHoleConnection.ts` - Main connection class
- Connect to `ws://127.0.0.1:9473`
- Handle WebSocket lifecycle (open, close, error, message)
- Expose connection state for status bar updates
- Clean disconnect on plugin unload

### 2. SmartHole Protocol Implementation
- Registration message with name, description, version
- Handle `registration_response` (success/failure)
- Receive `message` type with id, text, timestamp, metadata
- Send `response` type (ack, reject, notification)
- TypeScript interfaces matching protocol spec

### 3. Reconnection Logic
- Exponential backoff: 1s → 2s → 4s → 8s → 16s → 30s (capped)
- **Retry indefinitely** - no maximum attempt limit
- Reset backoff counter on successful connection
- Graceful handling when SmartHole is not running
- Continue retrying every 30 seconds indefinitely when disconnected

### 4. Message Handling Callbacks
- Event emitter or callback pattern for incoming messages
- Pass messages to processing pipeline
- Handle timeouts (30-second response window)

## Acceptance Criteria

- [ ] Plugin connects to SmartHole on load
- [ ] Registers with configurable name and description from settings
- [ ] Shows connection status updates in status bar
- [ ] Reconnects automatically with exponential backoff when disconnected
- [ ] Retries indefinitely (never gives up) when SmartHole is unavailable
- [ ] Handles SmartHole not running gracefully (no crashes)
- [ ] Receives routed messages and parses them correctly
- [ ] Sends ack responses within 30-second timeout
- [ ] Sends notification responses to SmartHole
- [ ] Cleanly disconnects on plugin unload
- [ ] Stops reconnection attempts when plugin is disabled

## Technical Considerations

- Use native browser WebSocket API (Electron environment)
- Heartbeat (ping/pong) handled automatically by WebSocket
- JSON parsing with validation for incoming messages
- Error handling for malformed messages
- Connection state machine: disconnected → connecting → connected → disconnected

## Dependencies

- **E-plugin-foundation-and-settings**: Requires settings for client name and routing description

## Estimated Scale

2 features:
1. WebSocket connection manager with protocol implementation
2. Reconnection logic and state management

## User Stories

- As a user, I want the plugin to automatically connect to SmartHole when I enable it
- As a user, I want the plugin to reconnect automatically if SmartHole restarts
- As a user, I want the plugin to keep trying to connect even if SmartHole has been down for a long time
- As a user, I want to see the connection status so I know if voice commands will work
- As a user, I want the plugin to work gracefully even if SmartHole isn't running

## Non-functional Requirements

- Connection established within 2 seconds when SmartHole is running
- Reconnection backoff prevents excessive connection attempts while remaining persistent
- No resource leaks on disconnect/reconnect cycles

## Reference

See `/reference-docs/smarthole-client-docs/protocol-reference.md` for complete protocol specification.