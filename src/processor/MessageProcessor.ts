/**
 * MessageProcessor - Orchestrates the complete message processing pipeline.
 *
 * Handles the flow: inbox save -> ack -> LLM processing -> notification -> inbox cleanup.
 * Includes retry logic for transient LLM failures and recovery of pending messages.
 */

import type { App } from "obsidian";
import type { SmartHoleSettings } from "../settings";
import type { SmartHoleConnection, RoutedMessage } from "../websocket";
import type { InboxManager, InboxMessage } from "../inbox";
import { LLMService, LLMError, extractTextContent, createVaultTools } from "../llm";
import type { MessageProcessorConfig, ProcessResult } from "./types";

/** Maximum number of retry attempts for transient LLM errors */
const MAX_RETRY_ATTEMPTS = 3;

/** Base delay in milliseconds for exponential backoff */
const RETRY_BASE_DELAY = 1000;

export class MessageProcessor {
  private connection: SmartHoleConnection;
  private inboxManager: InboxManager;
  private app: App;
  private settings: SmartHoleSettings;

  constructor(config: MessageProcessorConfig) {
    this.connection = config.connection;
    this.inboxManager = config.inboxManager;
    this.app = config.app;
    this.settings = config.settings;
  }

  /** Process a message through the complete pipeline. */
  async process(message: RoutedMessage, skipAck = false): Promise<ProcessResult> {
    const messageId = message.payload.id;

    // Step 1: Save to inbox for durability
    try {
      await this.inboxManager.save(message);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Failed to save message to inbox";
      console.error(`MessageProcessor: Failed to save message ${messageId} to inbox:`, error);
      return {
        success: false,
        messageId,
        error: errorMessage,
      };
    }

    // Step 2: Send acknowledgment (unless reprocessing)
    if (!skipAck) {
      this.connection.sendAck(messageId);
    }

    // Step 3: Process with LLM (with retry logic)
    const llmResult = await this.processWithRetry(message.payload.text);

    if (llmResult.success) {
      // Step 4a: Send success notification
      this.sendSuccessNotification(messageId, llmResult.response!);

      // Step 5: Remove from inbox on success
      try {
        await this.inboxManager.delete(messageId);
      } catch (error) {
        console.error(`MessageProcessor: Failed to delete message ${messageId} from inbox:`, error);
        // Don't fail the overall operation - message was processed successfully
      }

      return {
        success: true,
        messageId,
        response: llmResult.response,
      };
    } else {
      // Step 4b: Send error notification (leave message in inbox)
      this.sendErrorNotification(messageId, llmResult.error!);

      return {
        success: false,
        messageId,
        error: llmResult.error,
      };
    }
  }

  /** Reprocess all pending inbox messages from previous session. */
  async reprocessPending(): Promise<void> {
    let pendingMessages: InboxMessage[];

    try {
      pendingMessages = await this.inboxManager.listPending();
    } catch (error) {
      console.error("MessageProcessor: Failed to list pending messages:", error);
      return;
    }

    if (pendingMessages.length === 0) {
      console.log("MessageProcessor: No pending messages to reprocess");
      return;
    }

    console.log(`MessageProcessor: Reprocessing ${pendingMessages.length} pending message(s)`);

    for (const inboxMessage of pendingMessages) {
      // Convert InboxMessage back to RoutedMessage format
      const routedMessage: RoutedMessage = {
        type: "message",
        payload: {
          id: inboxMessage.id,
          text: inboxMessage.text,
          timestamp: inboxMessage.timestamp,
          metadata: inboxMessage.metadata,
        },
      };

      const result = await this.process(routedMessage, true);

      if (result.success) {
        console.log(`MessageProcessor: Successfully reprocessed message ${inboxMessage.id}`);
      } else {
        console.error(
          `MessageProcessor: Failed to reprocess message ${inboxMessage.id}: ${result.error}`
        );
      }
    }
  }

  private async processWithRetry(
    messageText: string
  ): Promise<{ success: true; response: string } | { success: false; error: string }> {
    let lastError: string | undefined;

    for (let attempt = 1; attempt <= MAX_RETRY_ATTEMPTS; attempt++) {
      try {
        // Create fresh LLMService instance for each processing
        const llmService = new LLMService(this.app, this.settings);
        await llmService.initialize();

        // Register all vault tools
        const tools = createVaultTools(this.app);
        for (const tool of tools) {
          llmService.registerTool(tool);
        }

        // Process the message
        const response = await llmService.processMessage(messageText);
        const textContent = extractTextContent(response);

        return {
          success: true,
          response: textContent,
        };
      } catch (error) {
        const isLLMError = error instanceof LLMError;
        const isRetryable = isLLMError && error.retryable;
        const errorMessage = error instanceof Error ? error.message : "Unknown error";

        console.error(
          `MessageProcessor: LLM processing failed (attempt ${attempt}/${MAX_RETRY_ATTEMPTS}):`,
          errorMessage
        );

        lastError = this.getUserFriendlyError(error);

        // Only retry for retryable errors and if we have attempts left
        if (!isRetryable || attempt >= MAX_RETRY_ATTEMPTS) {
          break;
        }

        // Exponential backoff before retry
        const delay = RETRY_BASE_DELAY * Math.pow(2, attempt - 1);
        console.log(`MessageProcessor: Retrying in ${delay}ms...`);
        await this.sleep(delay);
      }
    }

    return {
      success: false,
      error: lastError || "Unknown error during LLM processing",
    };
  }

  private sendSuccessNotification(messageId: string, response: string): void {
    this.connection.sendNotification(messageId, {
      body: response,
      priority: "normal",
    });
  }

  private sendErrorNotification(messageId: string, errorMessage: string): void {
    this.connection.sendNotification(messageId, {
      title: "SmartHole Error",
      body: errorMessage,
      priority: "high",
    });
  }

  private getUserFriendlyError(error: unknown): string {
    if (error instanceof LLMError) {
      switch (error.code) {
        case "auth_error":
          return "API key is missing or invalid. Please check your SmartHole settings.";
        case "rate_limit":
          return "Too many requests. Please try again in a moment.";
        case "network":
          return "Network error. Please check your internet connection.";
        case "invalid_request":
          return "Unable to process request. The message may be too long or contain invalid content.";
        default:
          return "An unexpected error occurred while processing your request.";
      }
    }

    if (error instanceof Error) {
      return error.message;
    }

    return "An unexpected error occurred while processing your request.";
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
