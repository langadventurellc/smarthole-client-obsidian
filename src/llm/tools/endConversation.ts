/**
 * endConversation Tool
 *
 * Enables the agent to explicitly end a conversation, triggering summary
 * generation and starting fresh context. This allows the agent to signal
 * "we're done with this topic" rather than relying solely on idle timeout.
 */

import type { ToolHandler } from "../LLMService";
import type { Tool } from "../types";
import type { ConversationManager } from "../../context";
import type { LLMService } from "../LLMService";

// =============================================================================
// Context Interface
// =============================================================================

/**
 * Context providing access to conversation management and LLM services.
 * Passed to the tool factory during registration.
 */
export interface EndConversationContext {
  /**
   * ConversationManager instance for managing conversation lifecycle.
   */
  conversationManager: ConversationManager;

  /**
   * Factory function to get the current LLM service for summary generation.
   * Uses a factory pattern because LLMService may not be initialized at
   * the time the tool is registered.
   */
  getLLMService: () => LLMService;
}

// =============================================================================
// Input Types
// =============================================================================

/**
 * Input schema for the end_conversation tool.
 */
export interface EndConversationInput {
  /**
   * Optional reason for ending the conversation.
   * Included in the result message for context.
   */
  reason?: string;
}

// =============================================================================
// Tool Definition
// =============================================================================

const toolDefinition: Tool = {
  name: "end_conversation",
  description:
    "End the current conversation and generate a summary. Use this when a topic is concluded, the user indicates they're done, or when moving to an unrelated topic. A new conversation will start with the next message.",
  inputSchema: {
    type: "object",
    properties: {
      reason: {
        type: "string",
        description:
          "Optional reason for ending the conversation (e.g., 'task completed', 'user requested', 'changing topics')",
      },
    },
    required: [],
  },
};

// =============================================================================
// Tool Factory
// =============================================================================

/**
 * Creates a ToolHandler for the end_conversation tool.
 *
 * @param context - The EndConversationContext providing conversation management
 * @returns A ToolHandler that can be registered with LLMService
 */
export function createEndConversationTool(context: EndConversationContext): ToolHandler {
  return {
    definition: toolDefinition,
    execute: async (input: Record<string, unknown>): Promise<string> => {
      const reason = input.reason as string | undefined;

      // Check if there's an active conversation to end
      const activeConversation = context.conversationManager.getActiveConversation();

      if (!activeConversation) {
        return "No active conversation to end.";
      }

      // End conversation with summary generation
      try {
        const llmService = context.getLLMService();
        await context.conversationManager.endConversation(llmService);

        const reasonSuffix = reason ? ` Reason: ${reason}` : "";
        return `Conversation ended successfully.${reasonSuffix} A summary has been generated. The next message will start a new conversation.`;
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        return `Failed to end conversation: ${errorMessage}`;
      }
    },
  };
}
