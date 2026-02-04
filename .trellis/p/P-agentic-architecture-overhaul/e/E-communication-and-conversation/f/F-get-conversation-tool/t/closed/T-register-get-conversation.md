---
id: T-register-get-conversation
title: Register get_conversation tool with LLMService
status: done
priority: medium
parent: F-get-conversation-tool
prerequisites:
  - T-export-get-conversation-tool
affectedFiles:
  src/llm/index.ts: Added exports for createGetConversationTool factory function
    and GetConversationContext, GetConversationInput types to the public LLM
    module API.
  src/processor/MessageProcessor.ts: Imported createGetConversationTool and
    GetConversationContext. Added registration of get_conversation tool in
    processWithRetry() method, creating GetConversationContext with
    conversationManager and registering the tool with llmService.
log:
  - Registered the get_conversation tool with LLMService during message
    processing. The tool is now available to the agent alongside other
    context-dependent tools (sendMessage, endConversation). Added exports to
    src/llm/index.ts and registered the tool in
    MessageProcessor.processWithRetry() with the ConversationManager instance
    passed via GetConversationContext. All quality checks pass (lint, format,
    type-check) and the build succeeds.
schema: v1.0
childrenIds: []
created: 2026-02-04T18:39:57.923Z
updated: 2026-02-04T18:39:57.923Z
---

# Register get_conversation tool with LLMService

## Overview
Register the `get_conversation` tool during plugin initialization so it's available to the agent. The tool needs access to the ConversationManager instance.

## Investigation Required
First, identify where `endConversation` and `sendMessage` tools are registered. These tools also require runtime context (ConversationManager, LLMService) and follow the same pattern.

Search for:
- `createEndConversationTool` usage
- `createSendMessageTool` usage
- Where tools are registered with `llmService.registerTool()`

## Implementation Details

### Import
```typescript
import { createGetConversationTool } from "./tools";
```

### Registration
Where other context-dependent tools are registered, add:
```typescript
const getConversationTool = createGetConversationTool({
  conversationManager: this.conversationManager,
});
this.llmService.registerTool(getConversationTool);
```

### Context Requirements
The tool only needs `conversationManager` (unlike `endConversation` which also needs `getLLMService`).

## Acceptance Criteria
- [ ] Tool registered during plugin/service initialization
- [ ] ConversationManager properly passed to tool factory
- [ ] Tool available to agent during message processing
- [ ] No circular dependency issues