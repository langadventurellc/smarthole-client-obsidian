---
id: T-define-websocket-protocol
title: Define WebSocket Protocol Types
status: done
priority: high
parent: F-websocket-connection-manager
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
    messages, union types/utilities, type guards)
log:
  - >-
    Created TypeScript type definitions for all SmartHole WebSocket protocol
    messages. Implementation includes:


    - Outgoing messages: RegistrationMessage and ResponseMessage (with
    ack/reject/notification variants)

    - Incoming messages: RegistrationResponseMessage (with success/failure
    payloads and error codes) and RoutedMessage (with metadata)

    - Union types: OutgoingMessage, IncomingMessage for exhaustive pattern
    matching

    - Type guards: isRegistrationResponse, isRoutedMessage,
    isRegistrationSuccess, isRegistrationFailure, isProtocolMessage,
    isIncomingMessage

    - Clean index.ts with organized exports grouped by category (outgoing,
    incoming, utilities, type guards)


    All types match the protocol-reference.md specification exactly. Quality
    checks pass (lint, format, type-check).
schema: v1.0
childrenIds: []
created: 2026-02-03T05:17:23.136Z
updated: 2026-02-03T05:17:23.136Z
---

# Define WebSocket Protocol Types

## Purpose

Create TypeScript type definitions for all SmartHole WebSocket protocol messages as specified in the protocol reference.

## Scope

Create `src/websocket/types.ts` with:

### Outgoing Messages (Client → Server)

1. **RegistrationMessage**
   - `type: "registration"`
   - `payload: RegistrationPayload`
   
2. **RegistrationPayload**
   - `name: string` (required)
   - `description: string` (required)
   - `version?: string` (optional)
   - `capabilities?: string[]` (optional)

3. **ResponseMessage**
   - `type: "response"`
   - `payload: ResponsePayload`

4. **ResponsePayload**
   - `messageId: string`
   - `type: "ack" | "reject" | "notification"`
   - `payload: AckPayload | RejectPayload | NotificationPayload`

5. **AckPayload** - empty object `{}`

6. **RejectPayload**
   - `reason?: string`

7. **NotificationPayload**
   - `title?: string`
   - `body?: string`
   - `priority?: "low" | "normal" | "high"`

### Incoming Messages (Server → Client)

1. **RegistrationResponseMessage**
   - `type: "registration_response"`
   - `payload: RegistrationResponsePayload`

2. **RegistrationResponsePayload**
   - Success variant: `{ success: true, clientId: string, message?: string }`
   - Failure variant: `{ success: false, code: RegistrationErrorCode, message: string }`

3. **RegistrationErrorCode** - enum/union type
   - `"INVALID_NAME"`
   - `"INVALID_DESCRIPTION"`
   - `"DUPLICATE_NAME"`
   - `"ALREADY_REGISTERED"`
   - `"VALIDATION_ERROR"`

4. **RoutedMessage**
   - `type: "message"`
   - `payload: RoutedMessagePayload`

5. **RoutedMessagePayload**
   - `id: string`
   - `text: string`
   - `timestamp: string` (ISO 8601)
   - `metadata: MessageMetadata`

6. **MessageMetadata**
   - `inputMethod: "voice" | "text"`
   - `directRouted: boolean`
   - `confidence?: number` (0-1, only for voice)
   - `routingReason?: string`

### Union Types and Type Guards

1. **OutgoingMessage** - union of all client→server messages
2. **IncomingMessage** - union of all server→client messages
3. Type guard functions:
   - `isRegistrationResponse(msg): msg is RegistrationResponseMessage`
   - `isRoutedMessage(msg): msg is RoutedMessage`

### Index File

Create `src/websocket/index.ts` to export all types.

## Files to Create

- `src/websocket/types.ts` - All protocol type definitions
- `src/websocket/index.ts` - Public exports

## Acceptance Criteria

- [ ] All message types match protocol-reference.md specification exactly
- [ ] Type guards correctly discriminate message types at runtime
- [ ] Types support optional fields where the protocol allows them
- [ ] Union types enable exhaustive pattern matching
- [ ] Exports are clean and organized in index.ts

## References

- Protocol specification: `/reference-docs/smarthole-client-docs/protocol-reference.md`