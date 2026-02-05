/**
 * getConversation Tool
 *
 * Enables the agent to retrieve past conversation details when context from
 * previous conversations is needed. Since past conversations are no longer
 * included in the system prompt, the agent uses this tool to access them on demand.
 */

import type { ToolHandler } from "../LLMService";
import type { Tool } from "../types";
import type { ConversationManager } from "../../context";
import { formatLocalTimestamp } from "../../utils/time";

// =============================================================================
// Context Interface
// =============================================================================

/**
 * Context providing access to conversation management.
 * Passed to the tool factory during registration.
 */
export interface GetConversationContext {
  /**
   * ConversationManager instance for retrieving conversation data.
   */
  conversationManager: ConversationManager;
}

// =============================================================================
// Input Types
// =============================================================================

/**
 * Input schema for the get_conversation tool.
 */
export interface GetConversationInput {
  /**
   * Specific conversation ID to retrieve full details.
   * When provided, returns complete conversation with all messages.
   */
  conversation_id?: string;

  /**
   * Number of most recent conversations to list (summaries only).
   * When provided, returns list of conversation summaries without full message content.
   * Defaults to 10 if not specified or invalid.
   */
  list_recent?: number;
}

// =============================================================================
// Response Types (for documentation, responses are JSON stringified)
// =============================================================================

/**
 * Response format for a single conversation retrieval.
 */
interface SingleConversationResponse {
  id: string;
  title: string | null;
  summary: string | null;
  startedAt: string;
  endedAt: string | null;
  messages: Array<{
    timestamp: string;
    role: "user" | "assistant";
    content: string;
    toolsUsed?: string[];
  }>;
}

/**
 * Response format for listing recent conversations.
 */
interface ConversationListResponse {
  conversations: Array<{
    id: string;
    title: string | null;
    summary: string | null;
    startedAt: string;
    endedAt: string | null;
    messageCount: number;
  }>;
}

// =============================================================================
// Tool Definition
// =============================================================================

const toolDefinition: Tool = {
  name: "get_conversation",
  description:
    "Retrieve past conversation details. Use with conversation_id to get a specific conversation's full history, or use list_recent to get summaries of recent conversations. Only completed conversations are accessible (not the current active one).",
  inputSchema: {
    type: "object",
    properties: {
      conversation_id: {
        type: "string",
        description:
          "The ID of a specific conversation to retrieve. Returns full conversation history with all messages.",
      },
      list_recent: {
        type: "number",
        description:
          "Number of recent conversations to list (summaries only, no full message content). Defaults to 10.",
      },
    },
    required: [],
  },
};

// =============================================================================
// Tool Factory
// =============================================================================

/**
 * Creates a ToolHandler for the get_conversation tool.
 *
 * @param context - The GetConversationContext providing conversation management
 * @returns A ToolHandler that can be registered with LLMService
 */
export function createGetConversationTool(context: GetConversationContext): ToolHandler {
  return {
    definition: toolDefinition,
    execute: async (input: Record<string, unknown>): Promise<string> => {
      const conversationId = input.conversation_id as string | undefined;
      const listRecent = input.list_recent as number | undefined;

      // Mode 1: Get specific conversation by ID
      if (conversationId !== undefined) {
        // Validate conversation_id is a non-empty string
        if (typeof conversationId !== "string" || conversationId.trim().length === 0) {
          return JSON.stringify({
            error: "conversation_id must be a non-empty string",
          });
        }

        const conversation = context.conversationManager.getConversation(conversationId);

        if (!conversation) {
          return JSON.stringify({
            error: `Conversation not found: ${conversationId}`,
          });
        }

        // Only allow access to completed conversations
        if (conversation.endedAt === null) {
          return JSON.stringify({
            error:
              "Cannot retrieve active conversation. Only completed conversations are accessible.",
          });
        }

        const response: SingleConversationResponse = {
          id: conversation.id,
          title: conversation.title,
          summary: conversation.summary,
          startedAt: formatLocalTimestamp(conversation.startedAt),
          endedAt: conversation.endedAt ? formatLocalTimestamp(conversation.endedAt) : null,
          messages: conversation.messages.map((msg) => ({
            timestamp: formatLocalTimestamp(msg.timestamp),
            role: msg.role,
            content: msg.content,
            ...(msg.toolsUsed && msg.toolsUsed.length > 0 ? { toolsUsed: msg.toolsUsed } : {}),
          })),
        };

        return JSON.stringify(response);
      }

      // Mode 2: List recent conversations (default behavior)
      let limit = 10;
      if (listRecent !== undefined) {
        // Validate list_recent is a positive number
        if (typeof listRecent === "number" && listRecent > 0) {
          limit = Math.floor(listRecent);
        }
        // Invalid values fall back to default of 10
      }

      const recentConversations = context.conversationManager.getRecentConversations(limit);

      const response: ConversationListResponse = {
        conversations: recentConversations.map((conv) => ({
          id: conv.id,
          title: conv.title,
          summary: conv.summary,
          startedAt: formatLocalTimestamp(conv.startedAt),
          endedAt: conv.endedAt ? formatLocalTimestamp(conv.endedAt) : null,
          messageCount: conv.messages.length,
        })),
      };

      return JSON.stringify(response);
    },
  };
}
