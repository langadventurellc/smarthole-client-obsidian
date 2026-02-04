---
id: T-integrate-send-message-tool
title: Integrate send_message tool into MessageProcessor
status: open
priority: high
parent: F-send-message-tool
prerequisites:
  - T-implement-send-message-tool
  - T-add-mid-execution-message
affectedFiles: {}
log: []
schema: v1.0
childrenIds: []
created: 2026-02-04T06:08:00.719Z
updated: 2026-02-04T06:08:00.719Z
---

# Integrate send_message tool into MessageProcessor

## Purpose

Wire up the send_message tool by creating the SendMessageContext with proper channel functions and registering the tool with LLMService during message processing.

## Implementation

Modify `src/processor/MessageProcessor.ts`:

### Import the tool factory

```typescript
import { createSendMessageTool, type SendMessageContext } from "../llm/tools/sendMessage";
```

### Update SendMessageContext interface to accept isQuestion

The `sendToChatView` function must accept the `isQuestion` parameter so it can be properly propagated to ChatView:

```typescript
interface SendMessageContext {
  sendToSmartHole: (message: string, priority?: 'normal' | 'high') => void;
  sendToChatView: (message: string, isQuestion: boolean) => void;  // Added isQuestion
  source: 'websocket' | 'direct';
}
```

### Create context and register tool in processWithRetry

```typescript
private async processWithRetry(
  messageText: string,
  messageId: string,
  source: "direct" | "websocket"
): Promise<...> {
  // ... existing setup ...

  for (let attempt = 1; attempt <= MAX_RETRY_ATTEMPTS; attempt++) {
    try {
      const llmService = new LLMService(this.app, this.settings);
      await llmService.initialize();
      llmService.setConversationContext(this.conversationHistory.getContextPrompt());

      // Register vault tools
      const tools = createVaultTools(this.app);
      const toolNames = tools.map((t) => t.definition.name);
      for (const tool of tools) {
        llmService.registerTool(tool);
      }

      // Create SendMessageContext and register send_message tool
      const sendMessageContext: SendMessageContext = {
        sendToSmartHole: (message: string, priority: 'normal' | 'high' = 'normal') => {
          this.connection.sendNotification(messageId, {
            body: message,
            priority,
          });
        },
        sendToChatView: (message: string, isQuestion: boolean) => {
          this.notifyAgentMessageCallbacks(message, isQuestion);
        },
        source,
      };
      
      const sendMessageTool = createSendMessageTool(sendMessageContext);
      llmService.registerTool(sendMessageTool);
      toolNames.push(sendMessageTool.definition.name);

      // ... rest of processing unchanged ...
    }
  }
}
```

### Export from tools index

Add to `src/llm/tools/index.ts`:

```typescript
export { createSendMessageTool, type SendMessageContext } from "./sendMessage";
```

Add to `src/llm/index.ts` (required since MessageProcessor imports from `../llm`):

```typescript
// Send Message Tool (separate from vault tools - needs context)
export { createSendMessageTool, type SendMessageContext } from "./tools/sendMessage";
```

## Acceptance Criteria

- [ ] SendMessageContext created with proper channel functions
- [ ] sendToSmartHole uses connection.sendNotification with messageId
- [ ] sendToChatView calls notifyAgentMessageCallbacks with message AND isQuestion
- [ ] send_message tool registered with LLMService
- [ ] Tool name added to toolNames array for tracking
- [ ] Exports added to both `src/llm/tools/index.ts` and `src/llm/index.ts`

## Files to Modify

- `src/processor/MessageProcessor.ts` (integration logic)
- `src/llm/tools/index.ts` (export)
- `src/llm/index.ts` (re-export)