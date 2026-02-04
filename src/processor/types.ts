/**
 * Message Processor Type Definitions
 *
 * Types for the message processing pipeline that orchestrates
 * inbox durability, LLM processing, and SmartHole notifications.
 */

import type { App } from "obsidian";
import type { ConversationHistory } from "../context";
import type { SmartHoleSettings } from "../settings";
import type { SmartHoleConnection } from "../websocket";
import type { InboxManager } from "../inbox";

export interface MessageProcessorConfig {
  connection: SmartHoleConnection;
  inboxManager: InboxManager;
  app: App;
  settings: SmartHoleSettings;
  conversationHistory: ConversationHistory;
}

export interface ProcessResult {
  success: boolean;
  messageId: string;
  response?: string;
  error?: string;
}

/**
 * Callback type for notifying listeners of processed message results.
 * Used by ChatView to receive responses from direct messages.
 */
export type ResponseCallback = (result: {
  messageId: string;
  success: boolean;
  response?: string;
  error?: string;
  originalMessage: string;
  toolsUsed: string[];
}) => void;

/**
 * Callback type for notifying listeners when a message is received for processing.
 * Used by ChatView to display incoming WebSocket messages in real-time.
 */
export type MessageReceivedCallback = (message: {
  type: "message";
  payload: {
    id: string;
    text: string;
    timestamp: string;
    metadata: {
      inputMethod: "voice" | "text";
      source?: "direct" | "websocket";
      directRouted?: boolean;
      confidence?: number;
      routingReason?: string;
    };
  };
}) => void;

/**
 * Callback type for mid-execution messages from the agent.
 * Used by send_message tool to deliver real-time updates during LLM processing.
 */
export type AgentMessageCallback = (message: {
  content: string;
  isQuestion: boolean;
  timestamp: string;
}) => void;
