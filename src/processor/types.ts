/**
 * Message Processor Type Definitions
 *
 * Types for the message processing pipeline that orchestrates
 * inbox durability, LLM processing, and SmartHole notifications.
 */

import type { App } from "obsidian";
import type { SmartHoleSettings } from "../settings";
import type { SmartHoleConnection } from "../websocket";
import type { InboxManager } from "../inbox";

export interface MessageProcessorConfig {
  connection: SmartHoleConnection;
  inboxManager: InboxManager;
  app: App;
  settings: SmartHoleSettings;
}

export interface ProcessResult {
  success: boolean;
  messageId: string;
  response?: string;
  error?: string;
}
