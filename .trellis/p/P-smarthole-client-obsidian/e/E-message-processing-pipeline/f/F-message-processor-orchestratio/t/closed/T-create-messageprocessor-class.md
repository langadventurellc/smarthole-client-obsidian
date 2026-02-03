---
id: T-create-messageprocessor-class
title: Create MessageProcessor class with full pipeline orchestration
status: done
priority: high
parent: F-message-processor-orchestratio
prerequisites: []
affectedFiles:
  src/processor/types.ts: Created MessageProcessorConfig and ProcessResult type definitions
  src/processor/MessageProcessor.ts: Created main orchestration class with
    process(), reprocessPending(), and retry logic
  src/processor/index.ts: Created module exports following codebase conventions
log:
  - >-
    Research complete. Verified:

    - InboxManager has save(), delete(), listPending(), get() methods

    - LLMService has initialize(), registerTool(), processMessage() methods

    - LLMError has retryable property for retry logic

    - SmartHoleConnection has sendAck(), sendNotification() methods

    - extractTextContent() extracts text from LLMResponse

    - createVaultTools(app) returns ToolHandler[]


    Starting implementation of src/processor/ module with types.ts,
    MessageProcessor.ts, and index.ts.
  - "Implemented MessageProcessor class that orchestrates the complete message
    processing pipeline. The class handles: (1) saving messages to inbox for
    durability, (2) sending acknowledgments to SmartHole, (3) processing
    messages through LLM with retry logic for transient failures (rate_limit,
    network errors), (4) sending success or error notifications via SmartHole,
    and (5) cleaning up the inbox on successful processing. Includes
    reprocessPending() method for recovering messages from previous sessions on
    plugin startup. All quality checks pass."
schema: v1.0
childrenIds: []
created: 2026-02-03T15:15:38.964Z
updated: 2026-02-03T15:15:38.964Z
---

# Create MessageProcessor Class

## Objective
Implement the `MessageProcessor` class that orchestrates the complete message processing flow: inbox save → ack → LLM processing → notification → inbox cleanup.

## Implementation Details

### File Structure
Create the following files in `src/processor/`:
- `MessageProcessor.ts` - Main orchestration class
- `types.ts` - ProcessResult and config types
- `index.ts` - Public exports

### Types to Define (`types.ts`)
```typescript
interface MessageProcessorConfig {
  connection: SmartHoleConnection;
  inboxManager: InboxManager;
  app: App;
  settings: SmartHoleSettings;
}

interface ProcessResult {
  success: boolean;
  messageId: string;
  response?: string;  // LLM's final text response
  error?: string;     // Error message if failed
}
```

### MessageProcessor Class Design
```typescript
class MessageProcessor {
  constructor(config: MessageProcessorConfig);
  
  async process(message: RoutedMessage): Promise<ProcessResult>;
  async reprocessPending(): Promise<void>;
}
```

### Processing Flow Implementation
The `process()` method must:
1. Save message to inbox immediately via `inboxManager.save()`
2. Send ack to SmartHole via `connection.sendAck()`
3. Create new LLMService instance and call `initialize()`
4. Register all vault tools using `createVaultTools(app)`
5. Call `llmService.processMessage(message.payload.text)`
6. On success: send notification with response, delete from inbox
7. On failure: implement retry logic (2-3 attempts for retryable errors)
8. On persistent failure: send error notification, leave message in inbox

### Retry Logic
- Only retry errors where `LLMError.retryable === true` (rate_limit, network)
- Do NOT retry auth_error, invalid_request, unknown errors
- Max 3 attempts with exponential backoff (1s, 2s, 4s delays)
- After exhausting retries, send error notification

### Error Notification Format
```typescript
connection.sendNotification(messageId, {
  title: "SmartHole Error",
  body: "User-friendly message here",
  priority: "high"
});
```

### reprocessPending() Method
- Called on plugin startup
- Gets all pending messages via `inboxManager.listPending()`
- Processes each message through `process()` in order (oldest first)
- Does NOT send ack again (messages already acked in previous session)
- Modify process() to accept optional flag to skip ack step

## Acceptance Criteria
- [ ] `src/processor/` directory created with all three files
- [ ] Types properly defined and exported
- [ ] MessageProcessor correctly sequences all operations
- [ ] Ack sent immediately after inbox save (not after LLM processing)
- [ ] LLM failures retried 2-3 times for retryable errors
- [ ] Non-retryable errors immediately send error notification
- [ ] Successful processing removes message from inbox
- [ ] Failed processing leaves message in inbox
- [ ] reprocessPending() works for startup recovery
- [ ] Uses extractTextContent() to get response text from LLMResponse

## Dependencies
Uses: SmartHoleConnection, InboxManager, LLMService, createVaultTools, RoutedMessage