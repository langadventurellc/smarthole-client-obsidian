/**
 * sendMessage Tool
 *
 * Enables the agent to communicate with users during task execution.
 * Supports both SmartHole WebSocket notifications and ChatView direct messages.
 */

import type { ToolHandler } from "../LLMService";
import type { Tool } from "../types";

// =============================================================================
// Context Interface
// =============================================================================

/**
 * Context providing communication channels to the send_message tool.
 * Passed to the tool factory during registration.
 */
export interface SendMessageContext {
  /**
   * Send a message via SmartHole notification.
   * Used when the original message came from WebSocket.
   *
   * @param message - The message content to send
   * @param priority - Optional priority level (defaults to 'normal')
   */
  sendToSmartHole: (message: string, priority?: "normal" | "high") => void;

  /**
   * Send a message to the ChatView sidebar.
   * Used for both direct and WebSocket messages (ChatView shows all).
   *
   * @param message - The message content to display
   * @param isQuestion - Whether this message is asking for user input
   */
  sendToChatView: (message: string, isQuestion: boolean) => void;

  /**
   * Source of the original message being processed.
   * Determines which channel is primary for responses.
   * - 'websocket': Message came from SmartHole WebSocket connection
   * - 'direct': Message came from ChatView direct input
   */
  source: "websocket" | "direct";

  /**
   * Signal that the agent is waiting for a user response.
   * Called when is_question=true to update conversation state in LLMService.
   *
   * @param message - The question message being sent
   */
  setWaitingForResponse?: (message: string) => void;
}

// =============================================================================
// Input Types
// =============================================================================

/**
 * Input schema for the send_message tool.
 */
export interface SendMessageInput {
  /** The message to send to the user */
  message: string;

  /** Whether this message is asking for user input (signals waiting state) */
  is_question?: boolean;
}

// =============================================================================
// Tool Definition
// =============================================================================

const toolDefinition: Tool = {
  name: "send_message",
  description:
    "Send a message to the user. Use this to provide updates, ask questions, or communicate progress during task execution. Messages are delivered immediately in real-time.",
  inputSchema: {
    type: "object",
    properties: {
      message: {
        type: "string",
        description: "The message to send to the user.",
      },
      is_question: {
        type: "boolean",
        description:
          "Set to true if this message is asking for user input. This signals that you are waiting for a response before continuing.",
      },
    },
    required: ["message"],
  },
};

// =============================================================================
// Tool Factory
// =============================================================================

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

      // Validate message is a non-empty string
      if (!message || typeof message !== "string" || message.trim().length === 0) {
        return "Error: message is required and must be a non-empty string.";
      }

      // Always send to ChatView (shows all messages), passing isQuestion flag
      context.sendToChatView(message, isQuestion);

      // Also send via SmartHole if source is websocket
      if (context.source === "websocket") {
        const priority = isQuestion ? "high" : "normal";
        context.sendToSmartHole(message, priority);
      }

      // Signal waiting state to LLMService when asking a question
      if (isQuestion && context.setWaitingForResponse) {
        context.setWaitingForResponse(message);
      }

      // Return acknowledgment with waiting state info
      if (isQuestion) {
        return "Message sent. Waiting for user response.";
      }
      return "Message sent successfully.";
    },
  };
}
