# WebSocket Connection

SmartHole client connection manager handling registration, message receiving, and response sending.

## Initialization

```typescript
import { SmartHoleConnection } from "./websocket";

const connection = new SmartHoleConnection(
  "ws://127.0.0.1:9473",
  {
    name: "Miss Simone",
    description: "Obsidian note management",
    version: "1.0.0",
  },
  {
    onMessage: (message) => console.log("Received:", message),
    onStatusChange: (status) => console.log("Status:", status),
  }
);

connection.connect();
```

## Connection Status

```typescript
type ConnectionStatus = "disconnected" | "connecting" | "connected" | "disabled";
```

The connection manager tracks status and notifies via the `onStatusChange` callback.

| Status | Description |
|--------|-------------|
| `disconnected` | Connection lost or failed |
| `connecting` | Attempting to establish connection |
| `connected` | Successfully connected and registered |
| `disabled` | User has disabled connection in settings |

The `disabled` status is set by the plugin when the user turns off "Enable SmartHole Connection" in settings. This is distinct from `disconnected`, which indicates a connection failure.

## Features

- **Auto-registration**: Sends registration payload immediately on WebSocket open
- **Reconnection**: Exponential backoff from 1s to 30s cap on connection failure
- **Type-safe messages**: Uses type guards for protocol message validation
- **Response methods**: Convenience methods for ack, reject, and notification responses

## Usage

### Sending Responses

```typescript
// Acknowledge message receipt
connection.sendAck(message.payload.id);

// Reject a message with reason
connection.sendReject(message.payload.id, "Cannot process request");

// Send notification to user
connection.sendNotification(message.payload.id, {
  title: "Note Created",
  body: "Created 'Meeting Notes.md' in Projects folder",
});
```

### Connection Lifecycle

```typescript
// Connect (starts auto-reconnection loop)
connection.connect();

// Disconnect (stops reconnection attempts)
connection.disconnect();

// Check current status
const status = connection.getStatus(); // "disconnected" | "connecting" | "connected"
```

### Dynamic Enable/Disable

The plugin provides a method to dynamically enable or disable the connection based on user settings:

```typescript
// In main.ts
plugin.setSmartHoleConnectionEnabled(false); // Disconnect and stop reconnection
plugin.setSmartHoleConnectionEnabled(true);  // Enable reconnection and connect
```

When disabled:
- WebSocket disconnects immediately
- Reconnection attempts stop
- Status bar shows "SmartHole: Disabled"

When re-enabled:
- Reconnection is enabled
- Connection attempt starts immediately
- Status returns to normal connected/disconnected states

## Protocol Messages

### Registration (Client → Server)

```typescript
{
  type: "registration",
  payload: {
    name: string,       // Client display name
    description: string, // Routing description for LLM
    version: string      // Client version
  }
}
```

### Message (Server → Client)

```typescript
{
  type: "message",
  payload: {
    id: string,         // Unique message ID
    text: string,       // User's voice/text input
    timestamp: string,  // ISO 8601 timestamp
    metadata?: {        // Optional context
      priority?: string,
      source?: string
    }
  }
}
```

### Response (Client → Server)

```typescript
// Acknowledgment
{ type: "response", payload: { type: "ack", messageId: string } }

// Rejection
{ type: "response", payload: { type: "reject", messageId: string, reason: string } }

// Notification request
{
  type: "response",
  payload: {
    type: "notification",
    messageId: string,
    title: string,
    body: string,
    priority?: "normal" | "high"
  }
}
```

## Reconnection Behavior

| Attempt | Delay |
|---------|-------|
| 1 | 1s |
| 2 | 2s |
| 3 | 4s |
| 4 | 8s |
| 5 | 16s |
| 6+ | 30s (cap) |

Reconnection continues indefinitely until `disconnect()` is called.

## Implementation

Located in `src/websocket/`:
- `SmartHoleConnection.ts` - Main connection class
- `types.ts` - Protocol type definitions and type guards
- `index.ts` - Public exports
