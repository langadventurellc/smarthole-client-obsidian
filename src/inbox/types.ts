/** Inbox module type definitions */

import type { MessageMetadata } from "../websocket/types";

export interface InboxMessage {
  /** Original message ID from SmartHole */
  id: string;
  /** ISO timestamp when message was originally created */
  timestamp: string;
  /** ISO timestamp when message was saved to inbox */
  receivedAt: string;
  /** Metadata from the original routed message */
  metadata: MessageMetadata;
  /** The original message text */
  text: string;
  /** File path in the vault (relative to vault root) */
  filePath: string;
}
