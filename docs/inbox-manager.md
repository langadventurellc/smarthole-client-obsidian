# Inbox Manager

Message durability layer that persists incoming messages before LLM processing, ensuring no message loss on failures.

## Initialization

```typescript
import { InboxManager } from "./inbox";

const inbox = new InboxManager(app.vault, ".smarthole/inbox");
```

## Purpose

The inbox provides crash recovery for message processing:

1. Message arrives via WebSocket
2. **Save to inbox** (durable storage)
3. Process with LLM (may fail)
4. On success: delete from inbox
5. On failure: message remains for retry

## Usage

### Saving Messages

```typescript
await inbox.save({
  id: "msg-123",
  text: "Create a note about the meeting",
  timestamp: "2026-02-03T10:30:00Z",
  metadata: { source: "voice" },
});
```

### Retrieving Messages

```typescript
// Get a specific message
const message = await inbox.get("msg-123");

// List all pending messages
const pending = await inbox.list();
```

### Deleting Messages

```typescript
// Remove after successful processing
await inbox.delete("msg-123");
```

## Storage Format

Messages are stored as JSON files in the inbox folder:

```
.smarthole/
└── inbox/
    ├── msg-abc123.json
    ├── msg-def456.json
    └── msg-ghi789.json
```

### File Contents

```json
{
  "id": "msg-abc123",
  "text": "Create a note about today's meeting",
  "timestamp": "2026-02-03T10:30:00.000Z",
  "metadata": {
    "source": "voice",
    "priority": "normal"
  }
}
```

## Startup Recovery

On plugin load, the MessageProcessor calls `reprocessPending()`:

```typescript
// In plugin onload()
const pending = await inbox.list();
for (const message of pending) {
  await processor.process(message, { skipAck: true });
}
```

- Iterates through all inbox messages
- Reprocesses each with `skipAck: true` (original ack already sent)
- Ensures no messages lost due to crashes or restarts

## Inbox Folder

The inbox folder is automatically created if it doesn't exist:

- Default location: `.smarthole/inbox/` in vault root
- Hidden folder (dot prefix) to avoid cluttering user's vault
- Can be safely deleted to clear all pending messages

## Interface

```typescript
interface InboxManager {
  save(message: RoutedMessage): Promise<void>;
  get(id: string): Promise<RoutedMessage | null>;
  list(): Promise<RoutedMessage[]>;
  delete(id: string): Promise<void>;
}
```

## Implementation

Located in `src/inbox/`:
- `types.ts` - Interface definitions
- `InboxManager.ts` - File-based inbox implementation
- `index.ts` - Public exports
