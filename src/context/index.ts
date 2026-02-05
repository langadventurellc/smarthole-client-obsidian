/**
 * Context Module
 *
 * Public exports for conversation history persistence.
 */

// Type Definitions (Legacy - kept for backward compatibility)
export type { HistoryEntry, ConversationSummary, PersistedHistory } from "./types";

// Type Definitions (New conversation-based model)
export type {
  Conversation,
  ConversationBranch,
  ConversationMessage,
  PersistedConversations,
} from "./types";

// Type Definitions (Conversation state tracking)
export type { ConversationState, PendingContext } from "./types";

// Manager Classes
export { ConversationHistory } from "./ConversationHistory";
export { ConversationManager } from "./ConversationManager";
