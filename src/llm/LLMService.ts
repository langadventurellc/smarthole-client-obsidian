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
import type { ConversationState } from "../context";
import { debug } from "../utils/logger";
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
  private abortController: AbortController | null = null;
  private isProcessing = false;

  // Conversation state tracking
  private waitingForResponse = false;
  private lastQuestionMessage: string | null = null;
  private waitingForMessageId: string | null = null;
  private toolCallsInSession = 0;

  constructor(app: App, settings: SmartHoleSettings, options?: { streaming?: boolean }) {
    this.app = app;
    this.settings = settings;
    this.provider = new AnthropicProvider(settings.model, { streaming: options?.streaming });
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

    // Reentrancy guard: prevent nested processMessage calls on the same instance.
    // This catches bugs where a tool (e.g. end_conversation) calls processMessage
    // on the same LLMService mid-execution, which would corrupt conversation history.
    if (this.isProcessing) {
      throw new Error(
        "LLMService.processMessage() called reentrantly — use a separate LLMService instance"
      );
    }
    this.isProcessing = true;

    // Create a new AbortController for this request
    this.abortController = new AbortController();

    // Add user message to history
    this.conversationHistory.push({
      role: "user",
      content: userMessage,
    });

    const truncatedMsg = userMessage.length > 100 ? userMessage.slice(0, 100) + "..." : userMessage;
    debug("LLM", `processMessage entry — "${truncatedMsg}" (${this.tools.size} tools registered)`);

    try {
      // Get tool definitions
      const toolDefs = this.getToolDefinitions();

      // Build system prompt
      const systemPrompt = this.buildSystemPrompt();

      // Send to LLM
      let response = await this.provider.sendMessage(
        this.conversationHistory,
        toolDefs.length > 0 ? toolDefs : undefined,
        systemPrompt,
        this.abortController.signal
      );

      // Handle tool use loop
      let iterations = 0;
      while (response.stopReason === "tool_use" && iterations < MAX_TOOL_ITERATIONS) {
        // Check if abort was requested before processing more tool calls
        if (this.abortController?.signal.aborted) {
          break;
        }

        iterations++;

        // Add assistant response to history
        this.conversationHistory.push({
          role: "assistant",
          content: response.content,
        });

        // Extract and execute tool calls
        const toolCalls = extractToolCalls(response);
        debug(
          "LLM",
          `tool loop iteration ${iterations} — stop_reason=${response.stopReason}, tools=[${toolCalls.map((t) => t.name).join(", ")}]`
        );
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
          systemPrompt,
          this.abortController.signal
        );
      }

      const finalHasToolUse = response.content.some((b) => b.type === "tool_use");
      debug(
        "LLM",
        `tool loop exited — stop_reason=${response.stopReason}, iterations=${iterations}, has_tool_use_in_final=${finalHasToolUse}`
      );

      // Warn if response was truncated due to max_tokens — tool calls may have been dropped
      if (response.stopReason === "max_tokens") {
        console.warn("LLM response truncated (max_tokens) — tool calls may have been dropped");
      }

      // If aborted via break from the tool loop, return a benign response
      if (this.abortController?.signal.aborted) {
        this.abortController = null;
        return {
          content: [],
          stopReason: "end_turn",
        };
      }

      // Add final assistant response to history
      this.conversationHistory.push({
        role: "assistant",
        content: response.content,
      });

      // Clean up AbortController
      this.abortController = null;

      // Trim history if it exceeds maximum length
      this.trimHistory();

      return response;
    } catch (error) {
      this.abortController = null;

      if (error instanceof LLMError && error.code === "aborted") {
        // Return a benign response -- the user message is already in history
        return {
          content: [],
          stopReason: "end_turn",
        };
      }

      throw error;
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Clear the conversation history.
   * Call this to start a fresh conversation context.
   */
  clearHistory(): void {
    this.conversationHistory = [];
  }

  /**
   * Abort the current in-flight LLM request.
   * Safe to call at any time -- no-op if not currently processing.
   */
  abort(): void {
    this.abortController?.abort();
    this.abortController = null;
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

  // ===========================================================================
  // Conversation State Management
  // ===========================================================================

  /**
   * Check if the agent is currently waiting for a user response.
   */
  isWaitingForUserResponse(): boolean {
    return this.waitingForResponse;
  }

  /**
   * Get the current conversation state for persistence.
   * Returns the state needed to restore a conversation after restart.
   */
  getConversationState(): ConversationState {
    return {
      isWaitingForResponse: this.waitingForResponse,
      pendingContext: this.waitingForResponse
        ? {
            originalMessageId: this.waitingForMessageId ?? "",
            toolCallsCompleted: this.toolCallsInSession,
            lastAgentMessage: this.lastQuestionMessage ?? "",
            createdAt: new Date().toISOString(),
          }
        : undefined,
    };
  }

  /**
   * Restore conversation state from persistence.
   * Called when continuing a conversation after plugin restart.
   *
   * @param state - The persisted conversation state to restore
   */
  restoreConversationState(state: ConversationState): void {
    this.waitingForResponse = state.isWaitingForResponse;
    this.lastQuestionMessage = state.pendingContext?.lastAgentMessage ?? null;
    this.waitingForMessageId = state.pendingContext?.originalMessageId ?? null;
    this.toolCallsInSession = state.pendingContext?.toolCallsCompleted ?? 0;
  }

  /**
   * Signal that the agent is waiting for a user response.
   * Called by send_message tool when is_question=true.
   *
   * @param message - The question message being sent to the user
   * @param messageId - The ID of the message that triggered the question
   */
  setWaitingForResponse(message: string, messageId: string): void {
    this.waitingForResponse = true;
    this.lastQuestionMessage = message;
    this.waitingForMessageId = messageId;
  }

  /**
   * Clear waiting state when conversation continues or completes.
   * Also resets the tool call counter for a fresh session.
   */
  clearWaitingState(): void {
    this.waitingForResponse = false;
    this.lastQuestionMessage = null;
    this.waitingForMessageId = null;
    this.toolCallsInSession = 0;
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

    const localTime = this.formatCurrentLocalTime();

    return `You are an intelligent assistant managing an Obsidian vault. You help users organize their notes, create new content, and find information.

The current local time is: ${localTime}

${iaSection}## Guidelines
- Make best-guess decisions rather than asking for clarification
- When uncertain about file location, use the most logical folder based on the information architecture
- For ambiguous requests, take reasonable action and explain what you did
- Send notifications via SmartHole to inform the user of actions taken
- Be concise in responses; focus on what was done rather than lengthy explanations

${toolsSection}${contextSection}`.trim();
  }

  /**
   * Format the current local time with IANA timezone name and UTC offset.
   * Example: "Thursday, Feb 5, 2026 2:30 PM (America/New_York, UTC-5)"
   */
  private formatCurrentLocalTime(): string {
    const now = new Date();

    const formatted = now.toLocaleString(undefined, {
      weekday: "long",
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });

    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

    // getTimezoneOffset() returns minutes, negative for east of UTC
    const offsetMinutes = now.getTimezoneOffset();
    const offsetSign = offsetMinutes <= 0 ? "+" : "-";
    const absOffset = Math.abs(offsetMinutes);
    const offsetHours = Math.floor(absOffset / 60);
    const offsetMins = absOffset % 60;
    const utcOffset =
      offsetMins === 0
        ? `UTC${offsetSign}${offsetHours}`
        : `UTC${offsetSign}${offsetHours}:${String(offsetMins).padStart(2, "0")}`;

    return `${formatted} (${timezone}, ${utcOffset})`;
  }

  /**
   * Execute a list of tool calls and return results.
   * Tracks the number of tool calls executed in this session.
   */
  private async executeToolCalls(toolCalls: ToolCall[]): Promise<ToolResultContentBlock[]> {
    const results: ToolResultContentBlock[] = [];

    for (const call of toolCalls) {
      // Short-circuit remaining tool calls if abort was requested
      if (this.abortController?.signal.aborted) {
        break;
      }

      const result = await this.executeToolCall(call);
      results.push(result);
      this.toolCallsInSession++;
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
      debug("LLM", `tool ${call.name} succeeded (result length=${result.length})`);
      return {
        type: "tool_result",
        toolUseId: call.id,
        content: result,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
      debug("LLM", `tool ${call.name} failed: ${errorMessage}`);
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
