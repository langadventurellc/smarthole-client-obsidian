---
id: T-implement-llmservice-for-tool
title: Implement LLMService for tool orchestration and conversation management
status: done
priority: high
parent: F-llm-service-layer-with
prerequisites:
  - T-implement-anthropicprovider
affectedFiles:
  src/llm/LLMService.ts: Created LLMService class with initialize(),
    registerTool(), unregisterTool(), processMessage(), clearHistory(), and
    getHistory() methods. Includes ToolHandler interface, system prompt
    construction with information architecture, tool use loop with max 10
    iterations, and conversation history trimming.
  src/llm/index.ts: Added exports for LLMService class and ToolHandler interface
log:
  - Implemented LLMService class that orchestrates tool registration,
    conversation management, and multi-turn tool use interactions with Claude.
    The service retrieves API keys from Obsidian's secret storage, builds system
    prompts with information architecture, executes tool calls in a loop until
    completion, and maintains bounded conversation history (max 20 messages).
schema: v1.0
childrenIds: []
created: 2026-02-03T06:23:31.471Z
updated: 2026-02-03T06:23:31.471Z
---

# Implement LLMService for Tool Orchestration and Conversation Management

## Purpose

Create the main LLM service class that orchestrates conversations with Claude, manages tool registration and execution, constructs system prompts, and maintains conversation history. This is the primary interface the plugin uses to process user messages.

## Implementation Details

Create `src/llm/LLMService.ts`:

### Class Structure
```typescript
import type { App } from 'obsidian';
import type { SmartHoleSettings } from '../settings';
import { AnthropicProvider } from './AnthropicProvider';
import type { LLMMessage, Tool, ToolCall, ToolResult, LLMResponse } from './types';

export interface ToolHandler {
  definition: Tool;
  execute: (input: Record<string, unknown>) => Promise<string>;
}

export class LLMService {
  private provider: AnthropicProvider;
  private tools: Map<string, ToolHandler> = new Map();
  private conversationHistory: LLMMessage[] = [];
  private app: App;
  private settings: SmartHoleSettings;

  constructor(app: App, settings: SmartHoleSettings) {
    this.app = app;
    this.settings = settings;
    this.provider = new AnthropicProvider(settings.model);
  }

  async initialize(): Promise<void> {
    // Retrieve API key from Obsidian secrets and initialize provider
  }

  registerTool(handler: ToolHandler): void {
    // Register a tool for use by the LLM
  }

  async processMessage(userMessage: string): Promise<LLMResponse> {
    // Main entry point for processing user messages
  }

  clearHistory(): void {
    // Reset conversation history
  }
}
```

### Key Implementation Points

1. **Initialization**
   - Retrieve API key: `this.app.secretStorage.get(this.settings.anthropicApiKeyName)`
   - Handle missing/empty secret name gracefully
   - Initialize the AnthropicProvider with the key

2. **Tool Registration**
   - Store tools in a Map keyed by tool name
   - Provide `registerTool()` method for adding tools
   - Return tool definitions array for LLM calls

3. **System Prompt Construction**
   Build system prompt that includes:
   ```
   You are an intelligent assistant managing an Obsidian vault. You help users organize their notes, create new content, and find information.

   ## Information Architecture
   {settings.informationArchitecture}

   ## Guidelines
   - Make best-guess decisions rather than asking for clarification
   - When uncertain about file location, use the most logical folder based on the information architecture
   - For ambiguous requests, take reasonable action and explain what you did
   - Send notifications via SmartHole to inform the user of actions taken
   - Be concise in responses; focus on what was done rather than lengthy explanations

   ## Available Tools
   You have access to tools for manipulating the vault. Use them to fulfill user requests.
   ```

4. **Message Processing Loop**
   ```typescript
   async processMessage(userMessage: string): Promise<LLMResponse> {
     // Add user message to history
     this.conversationHistory.push({ role: 'user', content: userMessage });

     // Get tool definitions
     const toolDefs = Array.from(this.tools.values()).map(t => t.definition);

     // Send to LLM
     let response = await this.provider.sendMessage(
       this.conversationHistory,
       toolDefs,
       this.buildSystemPrompt()
     );

     // Handle tool use loop
     while (response.stopReason === 'tool_use') {
       // Extract tool calls from response
       // Execute each tool call
       // Add assistant response and tool results to history
       // Send continuation to LLM
       response = await this.provider.sendMessage(...);
     }

     // Add final assistant response to history
     return response;
   }
   ```

5. **Tool Execution**
   - Extract `ToolCall` objects from response content
   - Look up handler by tool name
   - Execute handler with input
   - Wrap results in `ToolResult` format
   - Handle tool execution errors gracefully

6. **Conversation History**
   - Maintain history as `LLMMessage[]`
   - Include tool use and tool result content blocks
   - Provide `clearHistory()` for resetting context

## Files to Create

- `src/llm/LLMService.ts`

## Files to Modify

- `src/llm/index.ts` - Export `LLMService` and `ToolHandler`

## Acceptance Criteria

- [ ] `LLMService` class created with constructor accepting App and Settings
- [ ] `initialize()` retrieves API key from Obsidian secrets
- [ ] Missing API key secret produces clear error message
- [ ] `registerTool()` method allows adding tools
- [ ] System prompt includes information architecture from settings
- [ ] `processMessage()` sends user message and handles response
- [ ] Tool use loop executes tools and continues conversation
- [ ] Tool execution errors caught and returned to LLM
- [ ] Conversation history maintained across messages
- [ ] `clearHistory()` resets conversation state
- [ ] All public types exported from index

## Technical Notes

- `app.secretStorage.get(secretName)` is synchronous and returns `string | undefined`
- Tool handlers are async functions returning string results
- Keep conversation history bounded (consider max ~20 messages for MVP)
- Tool result content should be serialized JSON or plain text