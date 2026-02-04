---
id: T-implement-send-message-tool
title: Implement send_message tool
status: done
priority: high
parent: F-send-message-tool
prerequisites:
  - T-create-sendmessagecontext
affectedFiles:
  src/llm/tools/sendMessage.ts: Added imports for ToolHandler and Tool types,
    added toolDefinition constant with name 'send_message', description, and
    inputSchema, and added createSendMessageTool factory function that creates a
    ToolHandler with validation, ChatView and SmartHole delivery logic, and
    appropriate return messages
log:
  - Implemented the send_message tool in src/llm/tools/sendMessage.ts. Added
    imports for ToolHandler and Tool types, defined the toolDefinition constant
    with name, description and inputSchema, and exported the
    createSendMessageTool factory function. The tool validates that message is a
    non-empty string, always sends to ChatView with the isQuestion flag,
    conditionally sends to SmartHole when source is 'websocket' with appropriate
    priority ('high' for questions, 'normal' otherwise), and returns appropriate
    acknowledgment messages based on whether the message is a question.
schema: v1.0
childrenIds: []
created: 2026-02-04T06:07:37.515Z
updated: 2026-02-04T06:07:37.515Z
---

# Implement send_message tool

## Purpose

Create the `send_message` tool that allows the agent to communicate with users during task execution. This is the core tool implementation that uses the SendMessageContext to deliver messages.

## Implementation

Add to `src/llm/tools/sendMessage.ts`:

```typescript
import type { ToolHandler } from "../LLMService";
import type { Tool } from "../types";

const toolDefinition: Tool = {
  name: "send_message",
  description: "Send a message to the user. Use this to provide updates, ask questions, or communicate progress during task execution. Messages are delivered immediately in real-time.",
  inputSchema: {
    type: "object",
    properties: {
      message: {
        type: "string",
        description: "The message to send to the user.",
      },
      is_question: {
        type: "boolean",
        description: "Set to true if this message is asking for user input. This signals that you are waiting for a response before continuing.",
      },
    },
    required: ["message"],
  },
};

/**
 * Creates a ToolHandler for the send_message tool.
 *
 * @param context - The SendMessageContext providing communication channels
 * @returns A ToolHandler that can be registered with LLMService
 */
export function createSendMessageTool(context: SendMessageContext): ToolHandler {
  return {
    definition: toolDefinition,
    execute: async (input: Record<string, unknown>): Promise<string> => {
      const message = input.message as string;
      const isQuestion = (input.is_question as boolean) ?? false;

      if (!message || typeof message !== "string") {
        return "Error: message is required and must be a string.";
      }

      // Always send to ChatView (shows all messages), passing isQuestion flag
      context.sendToChatView(message, isQuestion);

      // Also send via SmartHole if source is websocket
      if (context.source === "websocket") {
        const priority = isQuestion ? "high" : "normal";
        context.sendToSmartHole(message, priority);
      }

      // Return acknowledgment with waiting state info
      if (isQuestion) {
        return `Message sent. Waiting for user response.`;
      }
      return `Message sent successfully.`;
    },
  };
}
```

## Behavior Notes

- Messages always go to ChatView (it displays all conversations)
- Messages go to SmartHole only for WebSocket-originated messages
- The `is_question` parameter uses "high" priority for SmartHole notifications
- The `is_question` parameter is passed to `sendToChatView` for proper propagation
- Return value indicates whether tool is waiting for response (for future conversation state integration)

## Acceptance Criteria

- [ ] Tool definition includes name, description, and input schema
- [ ] Tool validates that message is a non-empty string
- [ ] Tool sends to ChatView for all messages with isQuestion flag
- [ ] Tool sends to SmartHole only when source is 'websocket'
- [ ] Questions use 'high' priority for SmartHole notifications
- [ ] Return value indicates waiting state when is_question is true

## Files to Modify

- `src/llm/tools/sendMessage.ts` (add implementation after types)