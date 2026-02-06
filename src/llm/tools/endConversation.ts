/**
 * endConversation Tool
 *
 * Enables the agent to explicitly end a conversation, triggering summary
 * generation and starting fresh context. This allows the agent to signal
 * "we're done with this topic" rather than relying solely on idle timeout.
 */

import type { App } from "obsidian";
import type { ToolHandler } from "../LLMService";
import type { Tool } from "../types";
import type { ConversationManager } from "../../context";
import type { SmartHoleSettings } from "../../settings";

// =============================================================================
// Context Interface
// =============================================================================

/**
 * Context providing access to conversation management and app/settings
 * for creating isolated LLMService instances during summary generation.
 * Passed to the tool factory during registration.
 */
export interface EndConversationContext {
  /**
   * ConversationManager instance for managing conversation lifecycle.
   */
  conversationManager: ConversationManager;

  /**
   * Obsidian App instance for creating isolated LLMService instances.
   */
  app: App;

  /**
   * Plugin settings for creating isolated LLMService instances.
   */
  settings: SmartHoleSettings;
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

      // End conversation with summary generation (uses isolated LLMService internally)
      try {
        await context.conversationManager.endConversation({
          app: context.app,
          settings: context.settings,
        });

        const reasonSuffix = reason ? ` Reason: ${reason}` : "";
        return `Conversation ended successfully.${reasonSuffix} A summary has been generated. The next message will start a new conversation.`;
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        return `Failed to end conversation: ${errorMessage}`;
      }
    },
  };
}
