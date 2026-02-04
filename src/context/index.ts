/**
 * Context Module
 *
 * Public exports for conversation history persistence.
 */

// Type Definitions (Legacy - kept for backward compatibility)
export type { HistoryEntry, ConversationSummary, PersistedHistory } from "./types";

// Type Definitions (New conversation-based model)
export type { Conversation, ConversationMessage, PersistedConversations } from "./types";

// Manager Class
export { ConversationHistory } from "./ConversationHistory";
