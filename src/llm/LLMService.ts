/**
 * LLMService - Orchestrates tool registration, conversation management, and LLM interactions.
 *
 * This is the main service class for LLM integration. It manages:
 * - Tool registration and execution
 * - Conversation history maintenance
 * - System prompt construction with information architecture
 * - Multi-turn tool use conversations
 */

import type { App } from "obsidian";
import type { SmartHoleSettings } from "../settings";
import { AnthropicProvider } from "./AnthropicProvider";
import type { LLMMessage, LLMResponse, Tool, ToolCall, ToolResultContentBlock } from "./types";
import { extractToolCalls, LLMError } from "./types";

/** Maximum number of messages to retain in conversation history */
const MAX_HISTORY_LENGTH = 20;

/** Maximum number of tool use iterations to prevent infinite loops */
const MAX_TOOL_ITERATIONS = 10;

/**
 * Handler for a tool that can be called by the LLM.
 */
export interface ToolHandler {
  /** Tool definition passed to the LLM */
  definition: Tool;
  /** Execute the tool with the given input and return a string result */
  execute: (input: Record<string, unknown>) => Promise<string>;
}

/**
 * LLMService orchestrates conversations with Claude, managing tool registration,
 * execution, and conversation history.
 *
 * Usage:
 * ```typescript
 * const service = new LLMService(app, settings);
 * await service.initialize();
 * service.registerTool(myToolHandler);
 * const response = await service.processMessage("Create a new note about cats");
 * ```
 */
export class LLMService {
  private provider: AnthropicProvider;
  private tools: Map<string, ToolHandler> = new Map();
  private conversationHistory: LLMMessage[] = [];
  private app: App;
  private settings: SmartHoleSettings;
  private initialized = false;
  private conversationContext = "";

  constructor(app: App, settings: SmartHoleSettings) {
    this.app = app;
    this.settings = settings;
    this.provider = new AnthropicProvider(settings.model);
  }

  /**
   * Initialize the service by retrieving the API key from Obsidian's secret storage.
   * Must be called before processMessage().
   *
   * @throws LLMError with code 'auth_error' if API key is not configured or empty
   */
  async initialize(): Promise<void> {
    const secretName = this.settings.anthropicApiKeyName;

    if (!secretName || secretName.trim().length === 0) {
      throw LLMError.authError(
        "Anthropic API key not configured. Please select a secret in SmartHole settings."
      );
    }

    const apiKey = this.app.secretStorage.getSecret(secretName);

    if (!apiKey || apiKey.trim().length === 0) {
      throw LLMError.authError(
        `API key secret "${secretName}" not found or empty. Please configure it in Obsidian's secret storage.`
      );
    }

    await this.provider.initialize(apiKey);
    this.initialized = true;
  }

  /**
   * Register a tool for use by the LLM.
   * Tools can be registered before or after initialization.
   *
   * @param handler - The tool handler containing definition and execution function
   */
  registerTool(handler: ToolHandler): void {
    this.tools.set(handler.definition.name, handler);
  }

  /**
   * Unregister a tool by name.
   *
   * @param name - Name of the tool to unregister
   * @returns true if the tool was found and removed, false otherwise
   */
  unregisterTool(name: string): boolean {
    return this.tools.delete(name);
  }

  /**
   * Process a user message through the LLM.
   *
   * This is the main entry point for message processing. It:
   * 1. Adds the user message to conversation history
   * 2. Sends to the LLM with available tools and system prompt
   * 3. Handles tool use loop (execute tools, return results, continue)
   * 4. Returns the final response
   *
   * @param userMessage - The user's message text
   * @returns The final LLM response after any tool use
   * @throws LLMError if not initialized or if LLM call fails
   */
  async processMessage(userMessage: string): Promise<LLMResponse> {
    if (!this.initialized) {
      throw LLMError.authError("LLMService not initialized. Call initialize() first.");
    }

    // Add user message to history
    this.conversationHistory.push({
      role: "user",
      content: userMessage,
    });

    // Get tool definitions
    const toolDefs = this.getToolDefinitions();

    // Build system prompt
    const systemPrompt = this.buildSystemPrompt();

    // Send to LLM
    let response = await this.provider.sendMessage(
      this.conversationHistory,
      toolDefs.length > 0 ? toolDefs : undefined,
      systemPrompt
    );

    // Handle tool use loop
    let iterations = 0;
    while (response.stopReason === "tool_use" && iterations < MAX_TOOL_ITERATIONS) {
      iterations++;

      // Add assistant response to history
      this.conversationHistory.push({
        role: "assistant",
        content: response.content,
      });

      // Extract and execute tool calls
      const toolCalls = extractToolCalls(response);
      const toolResults = await this.executeToolCalls(toolCalls);

      // Add tool results to history
      this.conversationHistory.push({
        role: "user",
        content: toolResults,
      });

      // Continue conversation
      response = await this.provider.sendMessage(
        this.conversationHistory,
        toolDefs.length > 0 ? toolDefs : undefined,
        systemPrompt
      );
    }

    // Add final assistant response to history
    this.conversationHistory.push({
      role: "assistant",
      content: response.content,
    });

    // Trim history if it exceeds maximum length
    this.trimHistory();

    return response;
  }

  /**
   * Clear the conversation history.
   * Call this to start a fresh conversation context.
   */
  clearHistory(): void {
    this.conversationHistory = [];
  }

  /**
   * Get the current conversation history.
   * Useful for debugging or displaying conversation state.
   */
  getHistory(): readonly LLMMessage[] {
    return this.conversationHistory;
  }

  /**
   * Set conversation context from persistent history.
   * This context is included in the system prompt to provide continuity
   * across plugin restarts.
   *
   * @param context - Formatted context string from ConversationHistory
   */
  setConversationContext(context: string): void {
    this.conversationContext = context;
  }

  /**
   * Get all registered tool definitions.
   */
  private getToolDefinitions(): Tool[] {
    return Array.from(this.tools.values()).map((handler) => handler.definition);
  }

  /**
   * Build the system prompt including information architecture and conversation context.
   */
  private buildSystemPrompt(): string {
    const iaSection = this.settings.informationArchitecture.trim()
      ? `## Information Architecture\n${this.settings.informationArchitecture}\n\n`
      : "";

    const toolsSection =
      this.tools.size > 0
        ? `## Available Tools\nYou have access to tools for manipulating the vault. Use them to fulfill user requests.\n`
        : "";

    const contextSection = this.conversationContext.trim() ? `\n\n${this.conversationContext}` : "";

    return `You are an intelligent assistant managing an Obsidian vault. You help users organize their notes, create new content, and find information.

${iaSection}## Guidelines
- Make best-guess decisions rather than asking for clarification
- When uncertain about file location, use the most logical folder based on the information architecture
- For ambiguous requests, take reasonable action and explain what you did
- Send notifications via SmartHole to inform the user of actions taken
- Be concise in responses; focus on what was done rather than lengthy explanations

${toolsSection}${contextSection}`.trim();
  }

  /**
   * Execute a list of tool calls and return results.
   */
  private async executeToolCalls(toolCalls: ToolCall[]): Promise<ToolResultContentBlock[]> {
    const results: ToolResultContentBlock[] = [];

    for (const call of toolCalls) {
      const result = await this.executeToolCall(call);
      results.push(result);
    }

    return results;
  }

  /**
   * Execute a single tool call and return the result.
   */
  private async executeToolCall(call: ToolCall): Promise<ToolResultContentBlock> {
    const handler = this.tools.get(call.name);

    if (!handler) {
      return {
        type: "tool_result",
        toolUseId: call.id,
        content: `Error: Unknown tool "${call.name}"`,
        isError: true,
      };
    }

    try {
      const result = await handler.execute(call.input);
      return {
        type: "tool_result",
        toolUseId: call.id,
        content: result,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
      return {
        type: "tool_result",
        toolUseId: call.id,
        content: `Error executing tool "${call.name}": ${errorMessage}`,
        isError: true,
      };
    }
  }

  /**
   * Trim conversation history if it exceeds the maximum length.
   * Keeps the most recent messages while preserving message pairs.
   */
  private trimHistory(): void {
    if (this.conversationHistory.length > MAX_HISTORY_LENGTH) {
      // Remove oldest messages, keeping pairs intact
      const excess = this.conversationHistory.length - MAX_HISTORY_LENGTH;
      // Round up to nearest even number to keep message pairs
      const toRemove = excess + (excess % 2);
      this.conversationHistory = this.conversationHistory.slice(toRemove);
    }
  }
}
