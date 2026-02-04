/**
 * MessageProcessor - Orchestrates the complete message processing pipeline.
 *
 * Handles the flow: inbox save -> ack -> LLM processing -> notification -> inbox cleanup.
 * Includes retry logic for transient LLM failures and recovery of pending messages.
 */

import type { App } from "obsidian";
import type { ConversationManager, ConversationMessage } from "../context";
import type { SmartHoleSettings } from "../settings";
import type { SmartHoleConnection, RoutedMessage } from "../websocket";
import type { InboxManager, InboxMessage } from "../inbox";
import {
  LLMService,
  LLMError,
  extractTextContent,
  createVaultTools,
  createSendMessageTool,
  createEndConversationTool,
} from "../llm";
import type { SendMessageContext, EndConversationContext } from "../llm";
import type {
  MessageProcessorConfig,
  ProcessResult,
  ResponseCallback,
  MessageReceivedCallback,
  AgentMessageCallback,
} from "./types";

/** Maximum number of retry attempts for transient LLM errors */
const MAX_RETRY_ATTEMPTS = 3;

/** Base delay in milliseconds for exponential backoff */
const RETRY_BASE_DELAY = 1000;

export class MessageProcessor {
  private connection: SmartHoleConnection;
  private inboxManager: InboxManager;
  private app: App;
  private settings: SmartHoleSettings;
  private conversationManager: ConversationManager;
  private responseCallbacks: ResponseCallback[] = [];
  private messageReceivedCallbacks: MessageReceivedCallback[] = [];
  private agentMessageCallbacks: AgentMessageCallback[] = [];

  constructor(config: MessageProcessorConfig) {
    this.connection = config.connection;
    this.inboxManager = config.inboxManager;
    this.app = config.app;
    this.settings = config.settings;
    this.conversationManager = config.conversationManager;
  }

  /**
   * Register a callback to be notified when message processing completes.
   * Returns an unsubscribe function.
   */
  onResponse(callback: ResponseCallback): () => void {
    this.responseCallbacks.push(callback);
    return () => {
      const idx = this.responseCallbacks.indexOf(callback);
      if (idx >= 0) this.responseCallbacks.splice(idx, 1);
    };
  }

  /**
   * Register a callback to be notified when a message is received for processing.
   * Used by ChatView to display incoming WebSocket messages in real-time.
   * Returns an unsubscribe function.
   */
  onMessageReceived(callback: MessageReceivedCallback): () => void {
    this.messageReceivedCallbacks.push(callback);
    return () => {
      const idx = this.messageReceivedCallbacks.indexOf(callback);
      if (idx >= 0) this.messageReceivedCallbacks.splice(idx, 1);
    };
  }

  /**
   * Register a callback for mid-execution agent messages.
   * Used by ChatView to receive real-time updates from send_message tool.
   * Returns an unsubscribe function.
   */
  onAgentMessage(callback: AgentMessageCallback): () => void {
    this.agentMessageCallbacks.push(callback);
    return () => {
      const idx = this.agentMessageCallbacks.indexOf(callback);
      if (idx >= 0) this.agentMessageCallbacks.splice(idx, 1);
    };
  }

  /**
   * Notify listeners of a mid-execution agent message.
   * Called by send_message tool context during LLM processing.
   */
  notifyAgentMessageCallbacks(content: string, isQuestion: boolean): void {
    const message = {
      content,
      isQuestion,
      timestamp: new Date().toISOString(),
    };
    for (const callback of this.agentMessageCallbacks) {
      try {
        callback(message);
      } catch (err) {
        console.error("MessageProcessor: Agent message callback error:", err);
      }
    }
  }

  private notifyMessageReceivedCallbacks(message: RoutedMessage): void {
    for (const callback of this.messageReceivedCallbacks) {
      try {
        callback(message);
      } catch (err) {
        console.error("MessageProcessor: Message received callback error:", err);
      }
    }
  }

  private notifyResponseCallbacks(result: {
    messageId: string;
    success: boolean;
    response?: string;
    error?: string;
    originalMessage: string;
    toolsUsed: string[];
  }): void {
    for (const callback of this.responseCallbacks) {
      try {
        callback(result);
      } catch (err) {
        console.error("MessageProcessor: Response callback error:", err);
      }
    }
  }

  /** Process a message through the complete pipeline. */
  async process(message: RoutedMessage, skipAck = false): Promise<ProcessResult> {
    const messageId = message.payload.id;

    // Notify listeners that a message was received (for real-time sidebar updates)
    this.notifyMessageReceivedCallbacks(message);

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
    const source = message.payload.metadata?.source === "direct" ? "direct" : "websocket";
    const llmResult = await this.processWithRetry(message.payload.text, messageId, source);

    if (llmResult.success) {
      // Step 4a: Send success notification (skip for direct messages)
      if (message.payload.metadata?.source !== "direct") {
        this.sendSuccessNotification(messageId, llmResult.response!);
      }

      // Notify response callbacks regardless of source
      this.notifyResponseCallbacks({
        messageId,
        success: true,
        response: llmResult.response,
        originalMessage: message.payload.text,
        toolsUsed: llmResult.toolsUsed,
      });

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
      // Step 4b: Send error notification (skip for direct messages, leave message in inbox)
      if (message.payload.metadata?.source !== "direct") {
        this.sendErrorNotification(messageId, llmResult.error!);
      }

      // Notify response callbacks of error
      this.notifyResponseCallbacks({
        messageId,
        success: false,
        error: llmResult.error,
        originalMessage: message.payload.text,
        toolsUsed: [],
      });

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
    messageText: string,
    messageId: string,
    source: "direct" | "websocket"
  ): Promise<
    { success: true; response: string; toolsUsed: string[] } | { success: false; error: string }
  > {
    let lastError: string | undefined;

    for (let attempt = 1; attempt <= MAX_RETRY_ATTEMPTS; attempt++) {
      try {
        // Create fresh LLMService instance for each processing
        const llmService = new LLMService(this.app, this.settings);
        await llmService.initialize();

        // Set conversation context from ConversationManager
        llmService.setConversationContext(this.conversationManager.getContextPrompt());

        // Register all vault tools and track their names
        const tools = createVaultTools(this.app);
        const toolNames = tools.map((t) => t.definition.name);
        for (const tool of tools) {
          llmService.registerTool(tool);
        }

        // Create SendMessageContext and register send_message tool
        const sendMessageContext: SendMessageContext = {
          sendToSmartHole: (message: string, priority: "normal" | "high" = "normal") => {
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

        // Create EndConversationContext and register end_conversation tool
        const endConversationContext: EndConversationContext = {
          conversationManager: this.conversationManager,
          getLLMService: () => llmService,
        };

        const endConversationTool = createEndConversationTool(endConversationContext);
        llmService.registerTool(endConversationTool);
        toolNames.push(endConversationTool.definition.name);

        // Process the message
        const response = await llmService.processMessage(messageText);
        const textContent = extractTextContent(response);

        // Determine which tools were actually used by examining the response history
        const toolsUsed = this.extractToolsUsed(llmService, toolNames);

        // Record user message in conversation
        const timestamp = new Date().toISOString();
        const userMessage: ConversationMessage = {
          id: `${messageId}-user`,
          timestamp,
          role: "user",
          content: messageText,
        };
        // Pass llmService to enable auto-summary generation on idle timeout
        await this.conversationManager.addMessage(userMessage, llmService);

        // Record assistant response in conversation
        const assistantMessage: ConversationMessage = {
          id: `${messageId}-assistant`,
          timestamp,
          role: "assistant",
          content: textContent,
          toolsUsed: toolsUsed.length > 0 ? toolsUsed : undefined,
        };
        await this.conversationManager.addMessage(assistantMessage);

        return {
          success: true,
          response: textContent,
          toolsUsed,
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

  private extractToolsUsed(llmService: LLMService, availableTools: string[]): string[] {
    const history = llmService.getHistory();
    const toolsUsed = new Set<string>();

    for (const message of history) {
      if (message.role === "assistant" && Array.isArray(message.content)) {
        for (const block of message.content) {
          if (block.type === "tool_use" && availableTools.includes(block.name)) {
            toolsUsed.add(block.name);
          }
        }
      }
    }

    return Array.from(toolsUsed);
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
