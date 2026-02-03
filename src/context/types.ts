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
