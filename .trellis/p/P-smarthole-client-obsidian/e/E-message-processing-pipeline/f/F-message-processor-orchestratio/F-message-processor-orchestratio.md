---
id: F-message-processor-orchestratio
title: Message Processor Orchestration
status: done
priority: high
parent: E-message-processing-pipeline
prerequisites:
  - F-inbox-manager-for-message
affectedFiles:
  src/processor/types.ts: Created MessageProcessorConfig and ProcessResult type definitions
  src/processor/MessageProcessor.ts: Created main orchestration class with
    process(), reprocessPending(), and retry logic
  src/processor/index.ts: Created module exports following codebase conventions
  src/main.ts: Integrated InboxManager and MessageProcessor for full message
    processing pipeline
log:
  - "Auto-completed: All child tasks are complete"
schema: v1.0
childrenIds:
  - T-create-messageprocessor-class
  - T-integrate-messageprocessor-in
created: 2026-02-03T14:51:59.670Z
updated: 2026-02-03T14:51:59.670Z
---

# Message Processor Orchestration

## Purpose

Implement the central message processing flow that ties together WebSocket message reception, inbox durability, LLM processing, vault tool execution, and SmartHole notification responses.

## Scope

### In Scope
- Create `src/processor/MessageProcessor.ts` class
- Orchestrate the complete message flow:
  1. Receive message from WebSocket (`onMessage` callback)
  2. Save to inbox immediately (via InboxManager)
  3. Send ack to SmartHole
  4. Initialize LLMService and register tools
  5. Process message through LLM (handles tool loops internally)
  6. Send notification to SmartHole with result
  7. Remove from inbox on success
- Implement retry logic for transient LLM failures (2-3 attempts)
- Send user-friendly error notifications on persistent failures
- Keep failed messages in inbox for later retry
- Wire up MessageProcessor in `main.ts` to handle incoming messages

### Out of Scope
- Conversation history persistence (separate feature)
- Generate description from IA (separate feature)
- InboxManager implementation (prerequisite feature)

## Technical Details

### File Structure
```
src/processor/
├── MessageProcessor.ts  # Main orchestration class
├── types.ts             # ProcessResult and config types
└── index.ts             # Public exports
```

### API Design
```typescript
interface MessageProcessorConfig {
  connection: SmartHoleConnection;
  inboxManager: InboxManager;
  app: App;
  settings: SmartHoleSettings;
}

class MessageProcessor {
  constructor(config: MessageProcessorConfig);
  
  // Process a single message through the full pipeline
  async process(message: RoutedMessage): Promise<ProcessResult>;
  
  // Reprocess pending inbox messages (call on startup)
  async reprocessPending(): Promise<void>;
}

interface ProcessResult {
  success: boolean;
  messageId: string;
  response?: string;  // LLM's final text response
  error?: string;     // Error message if failed
}
```

### Processing Flow
```
Message Received
       │
       ▼
┌─────────────────┐
│ Save to Inbox   │ ← Durability first
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│   Send Ack      │ ← Confirm receipt
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ LLM Processing  │ ← Tool loops handled by LLMService
└────────┬────────┘
         │
    ┌────┴────┐
    │         │
    ▼         ▼
 Success    Failure
    │         │
    ▼         ▼
┌────────┐ ┌────────────┐
│Notify  │ │Retry (2-3x)│
│Success │ └─────┬──────┘
└───┬────┘       │
    │       ┌────┴────┐
    │       │         │
    │       ▼         ▼
    │    Success   Persistent
    │       │       Failure
    │       │         │
    │       │         ▼
    │       │    ┌─────────┐
    │       │    │Notify   │
    │       │    │Error    │
    │       │    └────┬────┘
    │       │         │
    ▼       ▼         │
┌─────────────────┐   │
│Delete from Inbox│   │ ← Don't delete on failure
└─────────────────┘   │
                      │
              (Message stays in inbox)
```

### Error Notifications
- Title: "SmartHole Error" or client name
- Body: User-friendly error message (not raw stack traces)
- Priority: "high" for errors

## Acceptance Criteria

- [ ] `MessageProcessor` class created in `src/processor/`
- [ ] Messages saved to inbox before ack is sent
- [ ] Ack sent immediately after inbox save
- [ ] LLMService initialized with API key from settings
- [ ] All vault tools registered with LLMService
- [ ] Successful processing sends notification via SmartHole
- [ ] Successful processing removes message from inbox
- [ ] LLM failures retried 2-3 times before giving up
- [ ] Persistent failures send error notification to user
- [ ] Failed messages remain in inbox
- [ ] `reprocessPending()` processes messages from previous sessions
- [ ] `main.ts` updated to use MessageProcessor for incoming messages
- [ ] Full end-to-end flow works: WebSocket → Inbox → LLM → Vault → Notification

## Dependencies

- **F-inbox-manager-for-message-durability**: Requires InboxManager for message persistence