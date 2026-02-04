/**
 * Context Module Type Definitions
 *
 * Types for conversation history persistence across plugin restarts.
 */

/**
 * A single conversation entry recording a user request and assistant response.
 */
export interface HistoryEntry {
  /** Unique identifier for this conversation */
  id: string;
  /** ISO timestamp when the conversation occurred */
  timestamp: string;
  /** Original user request text */
  userMessage: string;
  /** Final LLM response (text content only) */
  assistantResponse: string;
  /** Names of tools that were invoked during this conversation */
  toolsUsed: string[];
  /** Source of the message: "direct" for sidebar input, "websocket" for SmartHole server */
  source?: "direct" | "websocket";
}

/**
 * A summary of multiple older conversations.
 * Created when conversations are rotated out of the recent history.
 */
export interface ConversationSummary {
  /** ISO timestamp when the summarized period began */
  startDate: string;
  /** ISO timestamp when the summarized period ended */
  endDate: string;
  /** LLM-generated summary of the conversations */
  summary: string;
  /** Number of conversations included in this summary */
  conversationCount: number;
}

/**
 * The complete persisted conversation history structure.
 * Stored in plugin data via saveData().
 */
export interface PersistedHistory {
  /** Recent conversations kept in full detail */
  recentConversations: HistoryEntry[];
  /** Summarized older conversations */
  summaries: ConversationSummary[];
  /** ISO timestamp of the last summarization operation */
  lastSummarized: string;
}

// =============================================================================
// New Conversation-Based Data Model
// =============================================================================

/**
 * A single message within a conversation.
 */
export interface ConversationMessage {
  /** Unique identifier for this message */
  id: string;
  /** ISO 8601 timestamp when the message was created */
  timestamp: string;
  /** Role of the message sender */
  role: "user" | "assistant";
  /** Content of the message */
  content: string;
  /** Names of tools that were invoked during this message (assistant only) */
  toolsUsed?: string[];
}

/**
 * A discrete conversation session containing grouped messages.
 * Conversations are bounded by idle timeouts or explicit endings.
 */
export interface Conversation {
  /** Unique conversation ID (e.g., "conv-{timestamp}" or UUID) */
  id: string;
  /** ISO 8601 timestamp when the conversation started */
  startedAt: string;
  /** ISO 8601 timestamp when the conversation ended, null if active */
  endedAt: string | null;
  /** Auto-generated title for the conversation, null until ended */
  title: string | null;
  /** Auto-generated summary of the conversation, null until ended */
  summary: string | null;
  /** Messages in this conversation */
  messages: ConversationMessage[];
}

/**
 * Storage format for persisted conversations.
 * Used for the new conversation-based history system.
 */
export interface PersistedConversations {
  /** All stored conversations */
  conversations: Conversation[];
  /** ISO timestamp when migrated from old format, if applicable */
  lastMigrated?: string;
}

// =============================================================================
// Conversation State Tracking
// =============================================================================

/**
 * Context stored when the agent is waiting for a user response.
 * Enables conversation continuation after user replies.
 */
export interface PendingContext {
  /** ID of the message that initiated this pending state */
  originalMessageId: string;
  /** Number of tool calls completed before asking the question */
  toolCallsCompleted: number;
  /** The last message sent by the agent (usually the question) */
  lastAgentMessage: string;
  /** ISO 8601 timestamp when the pending state was created */
  createdAt: string;
}

/**
 * Tracks the current state of an active conversation.
 * Used to determine if the agent is waiting for a user response.
 */
export interface ConversationState {
  /** Whether the agent is currently waiting for user response */
  isWaitingForResponse: boolean;
  /** Context when waiting for a response, undefined when not waiting */
  pendingContext?: PendingContext;
}
