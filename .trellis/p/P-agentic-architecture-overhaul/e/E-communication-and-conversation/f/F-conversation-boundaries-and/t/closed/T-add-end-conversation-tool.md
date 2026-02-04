---
id: T-add-end-conversation-tool
title: Add End Conversation Tool
status: done
priority: medium
parent: F-conversation-boundaries-and
prerequisites:
  - T-implement-conversationmanager
  - T-implement-conversation-1
  - T-integrate-conversationmanager
affectedFiles:
  src/llm/tools/endConversation.ts: Created new file implementing the
    end_conversation tool with EndConversationContext and EndConversationInput
    interfaces, tool definition, and createEndConversationTool factory function
  src/llm/tools/index.ts: Added exports for createEndConversationTool and related
    types (EndConversationContext, EndConversationInput)
  src/llm/index.ts: Added re-exports for createEndConversationTool and related
    types from tools module
  src/processor/MessageProcessor.ts: Added import for createEndConversationTool
    and EndConversationContext; registered the end_conversation tool in
    processWithRetry() after send_message tool registration
log:
  - Implemented the end_conversation tool that allows the agent to explicitly
    end a conversation, triggering summary generation and starting fresh
    context. The tool follows the established pattern from sendMessage.ts with a
    context interface, input interface, tool definition, and factory function.
    When called, it checks for an active conversation, ends it via
    ConversationManager.endConversation() (which generates a summary using the
    LLM service), and returns a success message with the optional reason. The
    tool gracefully handles the case when no active conversation exists and
    catches any errors during the process.
schema: v1.0
childrenIds: []
created: 2026-02-04T17:12:49.874Z
updated: 2026-02-04T17:12:49.874Z
---

# Add End Conversation Tool

## Purpose

Allow the agent to explicitly end a conversation, triggering summary generation and starting fresh context. This enables the agent to signal "we're done with this topic" rather than relying solely on idle timeout.

## Implementation

### Tool Definition (`src/llm/tools/endConversation.ts`)

```typescript
import type { ToolHandler, Tool } from "./types";
import type { ConversationManager } from "../context";
import type { LLMService } from "../LLMService";

export interface EndConversationContext {
  conversationManager: ConversationManager;
  getLLMService: () => LLMService;  // Factory to get current LLM service for summary
}

export interface EndConversationInput {
  reason?: string;  // Optional reason for ending (included in summary)
}

const toolDefinition: Tool = {
  name: "end_conversation",
  description: "End the current conversation and generate a summary. Use this when a topic is concluded, the user indicates they're done, or when moving to an unrelated topic. A new conversation will start with the next message.",
  input_schema: {
    type: "object",
    properties: {
      reason: {
        type: "string",
        description: "Optional reason for ending the conversation (e.g., 'task completed', 'user requested', 'changing topics')"
      }
    },
    required: []
  }
};

export function createEndConversationTool(context: EndConversationContext): ToolHandler {
  return {
    definition: toolDefinition,
    handler: async (input: EndConversationInput): Promise<string> => {
      const activeConversation = context.conversationManager.getActiveConversation();
      
      if (!activeConversation) {
        return "No active conversation to end.";
      }
      
      // End conversation with summary generation
      try {
        const llmService = context.getLLMService();
        await context.conversationManager.endConversation(llmService);
        
        const reason = input.reason ? ` Reason: ${input.reason}` : "";
        return `Conversation ended successfully.${reason} A summary has been generated. The next message will start a new conversation.`;
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        return `Failed to end conversation: ${errorMessage}`;
      }
    }
  };
}
```

### Export from tools index

Add to `src/llm/tools/index.ts`:
```typescript
export { createEndConversationTool, type EndConversationContext, type EndConversationInput } from "./endConversation";
```

### Integration in MessageProcessor

Register the tool alongside other tools in `processWithRetry()`:

```typescript
// After registering vault tools and send_message tool

// Create EndConversationContext and register end_conversation tool
const endConversationContext: EndConversationContext = {
  conversationManager: this.conversationManager,
  getLLMService: () => llmService,  // Closure captures current llmService
};

const endConversationTool = createEndConversationTool(endConversationContext);
llmService.registerTool(endConversationTool);
toolNames.push(endConversationTool.definition.name);
```

### Update LLM re-export

Add to `src/llm/index.ts`:
```typescript
export { createEndConversationTool, type EndConversationContext, type EndConversationInput } from "./tools";
```

## Acceptance Criteria

- [ ] `end_conversation` tool defined in `src/llm/tools/endConversation.ts`
- [ ] Tool ends active conversation via `ConversationManager.endConversation()`
- [ ] Summary generated when conversation ends (uses current LLM service)
- [ ] Optional `reason` parameter included in result message
- [ ] Graceful handling when no active conversation exists
- [ ] Tool registered in `MessageProcessor.processWithRetry()`
- [ ] Exported from `src/llm/tools/index.ts` and `src/llm/index.ts`

## User Intent Detection

The agent should use this tool when:
- User says "that's all", "thanks", "done", "goodbye", etc.
- User explicitly asks to end the conversation
- Agent determines the task is complete and there's no follow-up expected
- User switches to a completely unrelated topic

The agent does NOT need explicit user permission to end - it can use judgment based on context.

## Dependencies

- Requires T-implement-conversationmanager-core
- Requires T-implement-conversation-summary (endConversation needs summary generation)
- Requires T-integrate-conversationmanager (MessageProcessor must have ConversationManager)

## Technical Notes

- The `getLLMService` factory pattern avoids passing LLMService directly (which might not be initialized yet)
- Summary generation happens synchronously before returning - don't fire-and-forget
- After ending, `getContextPrompt()` will return empty until a new message starts a conversation