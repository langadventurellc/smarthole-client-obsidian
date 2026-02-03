---
id: T-integrate-messageprocessor-in
title: Integrate MessageProcessor in main.ts
status: open
priority: high
parent: F-message-processor-orchestratio
prerequisites:
  - T-create-messageprocessor-class
affectedFiles: {}
log: []
schema: v1.0
childrenIds: []
created: 2026-02-03T15:15:51.768Z
updated: 2026-02-03T15:15:51.768Z
---

# Integrate MessageProcessor in main.ts

## Objective
Wire up the MessageProcessor in the main plugin class to handle incoming SmartHole messages and reprocess pending messages on startup.

## Implementation Details

### Changes to SmartHolePlugin class

1. **Add new imports:**
```typescript
import { InboxManager } from "./inbox";
import { MessageProcessor } from "./processor";
```

2. **Add new private members:**
```typescript
private inboxManager: InboxManager | null = null;
private messageProcessor: MessageProcessor | null = null;
```

3. **Update `onload()` method:**

After connection setup and before `connect()`:
```typescript
// Initialize InboxManager
this.inboxManager = new InboxManager(this.app.vault);

// Initialize MessageProcessor
this.messageProcessor = new MessageProcessor({
  connection: this.connection,
  inboxManager: this.inboxManager,
  app: this.app,
  settings: this.settings,
});

// Update the onMessage handler to use MessageProcessor
this.connection.onMessage = async (message) => {
  const result = await this.messageProcessor!.process(message);
  if (!result.success) {
    console.error("SmartHole: Message processing failed", result.error);
  }
};
```

4. **Add startup reprocessing:**
After `connect()` is called:
```typescript
// Reprocess any pending messages from previous sessions
this.messageProcessor.reprocessPending().catch((error) => {
  console.error("SmartHole: Failed to reprocess pending messages", error);
});
```

5. **Update `onunload()` method:**
Clear references (InboxManager and MessageProcessor don't need explicit cleanup):
```typescript
this.inboxManager = null;
this.messageProcessor = null;
```

### Critical Considerations

- InboxManager is created with `this.app.vault` which is available in onload
- MessageProcessor must be created AFTER connection exists
- The onMessage callback is now async and processes through the full pipeline
- reprocessPending() is called with `.catch()` to avoid blocking plugin load
- Error logging for failed message processing to aid debugging

## Acceptance Criteria
- [ ] InboxManager instantiated in onload
- [ ] MessageProcessor instantiated with all required config
- [ ] onMessage callback properly invokes messageProcessor.process()
- [ ] reprocessPending() called after connect() without blocking
- [ ] References cleared in onunload
- [ ] Console logging for failures maintained for debugging
- [ ] Plugin still loads successfully if reprocessPending fails

## Dependencies
Depends on: T-create-messageprocessor-class