---
id: E-message-processing-pipeline
title: Message Processing Pipeline
status: in-progress
priority: medium
parent: P-smarthole-client-obsidian
prerequisites:
  - E-smarthole-websocket
  - E-llm-service-and-vault-tools
affectedFiles:
  src/inbox/types.ts: Created inbox message type definitions with InboxMessage
    interface importing MessageMetadata from websocket types
  src/inbox/index.ts: Created module public exports file with InboxMessage type
    export and placeholder for InboxManager; Updated exports to include
    InboxManager class
  src/inbox/InboxManager.ts: Created InboxManager class with save, delete,
    listPending, and get methods for message durability
  src/processor/types.ts: Created MessageProcessorConfig and ProcessResult type definitions
  src/processor/MessageProcessor.ts: Created main orchestration class with
    process(), reprocessPending(), and retry logic
  src/processor/index.ts: Created module exports following codebase conventions
log: []
schema: v1.0
childrenIds:
  - F-conversation-history
  - F-inbox-manager-for-message
  - F-message-processor-orchestratio
created: 2026-02-03T03:40:43.280Z
updated: 2026-02-03T03:40:43.280Z
---

# Message Processing Pipeline

## Purpose and Goals

Implement the end-to-end message processing flow that ties together WebSocket message reception, inbox durability, LLM processing, vault tool execution, and SmartHole notification responses. Also implement conversation context management for multi-turn awareness.

## Major Components and Deliverables

### 1. Inbox Manager (Message Durability)
- `src/inbox/InboxManager.ts`
- Save incoming messages to `.smarthole/inbox/` before processing
- Filename format: `{timestamp}-{messageId}.md`
- Message content includes original text, metadata, timestamp
- Delete from inbox after successful processing
- Failed messages remain for later reprocessing
- Method to list/reprocess pending messages

### 2. Message Processor
- Orchestrate the complete message flow:
  1. Receive message from WebSocket
  2. Save to inbox immediately
  3. Send ack to SmartHole
  4. Build LLM context (system prompt + conversation history + user message)
  5. Call LLM with available tools
  6. Execute tool calls as needed
  7. Send notification to SmartHole with result
  8. Remove from inbox on success
- Handle tool execution loops (LLM may call multiple tools)

### 3. Conversation History Manager
- `src/context/ConversationHistory.ts`
- Store recent conversations in plugin data (not vault files)
- Rolling window of recent messages (last N conversations)
- Summary generation for older conversations
- Provide searchable context for LLM
- Clear old history automatically

### 4. Error Handling and Notifications
- Retry LLM calls on transient failures (2-3 attempts)
- Notify user via SmartHole on persistent failures
- Include helpful error messages in notifications
- Keep failed messages in inbox for retry

### 5. "Generate Description from IA" Feature
- Button in settings to auto-generate routing description
- Use LLM to summarize information architecture into a routing description
- Helps users create effective routing descriptions

## Acceptance Criteria

- [ ] Incoming messages saved to inbox before any processing
- [ ] Messages processed through LLM with appropriate tools
- [ ] Successful actions send notification via SmartHole
- [ ] Failed actions notify user via SmartHole with error info
- [ ] Failed messages remain in inbox for later processing
- [ ] Conversation history available to LLM for context
- [ ] History stored in plugin data, not visible vault files
- [ ] Old conversation summaries maintained
- [ ] "Generate description from IA" button works
- [ ] Full end-to-end flow works: voice → SmartHole → plugin → LLM → vault → notification

## Technical Considerations

- Inbox folder created on first message if not exists
- Use ISO timestamp for inbox filenames (sortable)
- Plugin data storage for conversation history (`saveData()`)
- Consider history size limits (e.g., last 50 conversations)
- Summary generation uses separate LLM call
- Error messages should be user-friendly

## Dependencies

- **E-smarthole-websocket**: Provides incoming messages and notification sending
- **E-llm-service-and-vault-tools**: Provides LLM processing and tool execution

## Estimated Scale

2-3 features:
1. Inbox manager for message durability
2. Message processor orchestrating the flow
3. Conversation history and context management

## User Stories

- As a user, I don't lose my voice commands if the API is temporarily unavailable
- As a user, I get notified when my command has been processed
- As a user, I get helpful error messages when something goes wrong
- As a user, I can have multi-turn conversations ("add milk to the list" → "and eggs too")
- As a user, I can generate a routing description from my information architecture

## Non-functional Requirements

- Inbox write completes before ack sent (data safety)
- Notification sent within 30 seconds of message receipt
- History queries complete in under 100ms
- Inbox files cleaned up after successful processing

## Reference

See `/reference-docs/smarthole-client-docs/response-patterns.md` for notification format