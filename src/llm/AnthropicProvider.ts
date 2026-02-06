/**
 * AnthropicProvider - LLM provider implementation for Anthropic's Claude API.
 *
 * Handles communication with Claude, message/tool format conversion,
 * and retry logic with exponential backoff for transient failures.
 */

import Anthropic from "@anthropic-ai/sdk";
import { debug } from "../utils/logger";
import type { ContentBlock, LLMMessage, LLMProvider, LLMResponse, StopReason, Tool } from "./types";
import { LLMError } from "./types";
import type { ClaudeModelId } from "../types";

/** Maximum retry attempts for transient failures */
const MAX_RETRY_ATTEMPTS = 3;

/** Base delay for exponential backoff (1 second) */
const RETRY_BASE_DELAY_MS = 1000;

/** Default max tokens for responses */
const DEFAULT_MAX_TOKENS = 64000;

/**
 * AnthropicProvider implements the LLMProvider interface for Claude API.
 *
 * Usage:
 * ```typescript
 * const provider = new AnthropicProvider("claude-haiku-4-5-20251001");
 * await provider.initialize(apiKey);
 * const response = await provider.sendMessage(messages, tools, systemPrompt);
 * ```
 */
export class AnthropicProvider implements LLMProvider {
  private client: Anthropic | null = null;
  private model: ClaudeModelId;

  constructor(model: ClaudeModelId) {
    this.model = model;
  }

  /**
   * Initialize the provider with an API key.
   * Must be called before sendMessage().
   *
   * @throws LLMError with code 'auth_error' if API key is missing or invalid format
   */
  async initialize(apiKey: string): Promise<void> {
    if (!apiKey || typeof apiKey !== "string" || apiKey.trim().length === 0) {
      throw LLMError.authError("Invalid API key. Please check your Anthropic API key in settings.");
    }

    this.client = new Anthropic({
      apiKey: apiKey.trim(),
      dangerouslyAllowBrowser: true, // Required for Electron/Obsidian environment
    });
  }

  /**
   * Send messages to Claude and get a response.
   *
   * Implements retry logic with exponential backoff for transient failures
   * (network errors, rate limits, server errors).
   */
  async sendMessage(
    messages: LLMMessage[],
    tools?: Tool[],
    systemPrompt?: string,
    signal?: AbortSignal
  ): Promise<LLMResponse> {
    if (!this.client) {
      throw LLMError.authError("Provider not initialized. Call initialize() with API key first.");
    }

    const anthropicMessages = this.convertMessages(messages);
    const anthropicTools = tools ? this.convertTools(tools) : undefined;

    let lastError: LLMError | null = null;

    for (let attempt = 0; attempt < MAX_RETRY_ATTEMPTS; attempt++) {
      try {
        debug(
          "Anthropic",
          `sendMessage — model=${this.model}, messages=${anthropicMessages.length}, tools=${anthropicTools?.length ?? 0}`
        );

        const response = await this.client.messages.create(
          {
            model: this.model,
            max_tokens: DEFAULT_MAX_TOKENS,
            messages: anthropicMessages,
            ...(anthropicTools &&
              anthropicTools.length > 0 && {
                tools: anthropicTools,
                tool_choice: { type: "auto" as const, disable_parallel_tool_use: true },
              }),
            ...(systemPrompt && { system: systemPrompt }),
          },
          { signal }
        );

        debug(
          "Anthropic",
          `response — stop_reason=${response.stop_reason}, output_tokens=${response.usage.output_tokens}, content_blocks=${response.content.length}`
        );

        return this.convertResponse(response);
      } catch (error) {
        const llmError = this.classifyError(error);

        // Non-retryable errors fail immediately
        if (!llmError.retryable) {
          throw llmError;
        }

        lastError = llmError;

        // Don't wait after the last attempt
        if (attempt < MAX_RETRY_ATTEMPTS - 1) {
          const delay = this.calculateBackoffDelay(attempt);
          debug("Anthropic", `retry attempt ${attempt + 1} after ${delay}ms — ${llmError.message}`);
          await this.sleep(delay);
        }
      }
    }

    // All retries exhausted
    throw lastError ?? LLMError.unknown("Request failed after retries");
  }

  /**
   * Convert LLMMessage array to Anthropic's message format.
   */
  private convertMessages(messages: LLMMessage[]): Anthropic.MessageCreateParams["messages"] {
    return messages.map((msg) => ({
      role: msg.role,
      content: this.convertMessageContent(msg.content),
    }));
  }

  /**
   * Convert message content (string or ContentBlock[]) to Anthropic format.
   * Uses Anthropic's MessageParam content types for proper typing.
   */
  private convertMessageContent(
    content: string | ContentBlock[]
  ): string | Anthropic.MessageParam["content"] {
    if (typeof content === "string") {
      return content;
    }

    return content.map((block): Anthropic.ContentBlockParam => {
      switch (block.type) {
        case "text":
          return {
            type: "text" as const,
            text: block.text,
          };
        case "tool_use":
          return {
            type: "tool_use" as const,
            id: block.id,
            name: block.name,
            input: block.input,
          };
        case "tool_result":
          return {
            type: "tool_result" as const,
            tool_use_id: block.toolUseId,
            content: block.content,
            ...(block.isError && { is_error: block.isError }),
          };
      }
    });
  }

  /**
   * Convert Tool array to Anthropic's tool format.
   */
  private convertTools(tools: Tool[]): Anthropic.Tool[] {
    return tools.map((tool) => ({
      name: tool.name,
      description: tool.description,
      input_schema: tool.inputSchema as Anthropic.Tool["input_schema"],
    }));
  }

  /**
   * Convert Anthropic response to LLMResponse format.
   * Filters out thinking blocks as they are internal to the model.
   */
  private convertResponse(response: Anthropic.Message): LLMResponse {
    const content: ContentBlock[] = [];

    for (const block of response.content) {
      if (block.type === "text") {
        content.push({
          type: "text" as const,
          text: block.text,
        });
      } else if (block.type === "tool_use") {
        content.push({
          type: "tool_use" as const,
          id: block.id,
          name: block.name,
          input: block.input as Record<string, unknown>,
        });
      }
      // Skip thinking and redacted_thinking blocks - they are internal to the model
    }

    return {
      content,
      stopReason: this.convertStopReason(response.stop_reason),
      usage: {
        inputTokens: response.usage.input_tokens,
        outputTokens: response.usage.output_tokens,
      },
    };
  }

  /**
   * Convert Anthropic stop_reason to StopReason type.
   */
  private convertStopReason(stopReason: Anthropic.Message["stop_reason"]): StopReason {
    switch (stopReason) {
      case "end_turn":
        return "end_turn";
      case "tool_use":
        return "tool_use";
      case "max_tokens":
        return "max_tokens";
      case "stop_sequence":
        return "stop_sequence";
      default:
        return "end_turn";
    }
  }

  /**
   * Classify an error from the Anthropic SDK into an LLMError.
   */
  private classifyError(error: unknown): LLMError {
    // Handle user-initiated abort (must check before APIError since APIUserAbortError extends APIError)
    if (error instanceof Anthropic.APIUserAbortError) {
      return LLMError.aborted("Request was cancelled by user.");
    }

    // Handle Anthropic API errors
    if (error instanceof Anthropic.APIError) {
      const status = error.status;

      // Authentication errors (401) - non-retryable
      if (status === 401) {
        return LLMError.authError(
          "Invalid API key. Please check your Anthropic API key in settings."
        );
      }

      // Bad request errors (400) - non-retryable
      if (status === 400) {
        return LLMError.invalidRequest(
          `Invalid request: ${error.message || "Check message format and parameters."}`
        );
      }

      // Rate limit errors (429) - retryable
      if (status === 429) {
        return LLMError.rateLimit("Rate limited by Anthropic. Please wait and try again.");
      }

      // Server errors (5xx) - retryable
      if (status >= 500 && status < 600) {
        return new LLMError(`Anthropic server error (${status}). Retrying...`, "unknown", true);
      }

      // Other API errors - non-retryable
      return LLMError.unknown(`Anthropic API error: ${error.message}`);
    }

    // Network errors - retryable
    if (error instanceof Error) {
      const isNetworkError =
        error.message.includes("network") ||
        error.message.includes("ECONNREFUSED") ||
        error.message.includes("ENOTFOUND") ||
        error.message.includes("ETIMEDOUT") ||
        error.message.includes("fetch failed") ||
        error.name === "TypeError";

      if (isNetworkError) {
        return LLMError.network("Network error connecting to Anthropic. Check your connection.");
      }

      return LLMError.unknown(error.message);
    }

    return LLMError.unknown("An unknown error occurred");
  }

  /**
   * Calculate exponential backoff delay for retry attempts.
   * Returns delay in milliseconds: 1s, 2s, 4s for attempts 0, 1, 2.
   */
  private calculateBackoffDelay(attempt: number): number {
    return RETRY_BASE_DELAY_MS * Math.pow(2, attempt);
  }

  /**
   * Sleep for the specified number of milliseconds.
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
