/**
 * Message Processor Module
 *
 * Public exports for the message processing pipeline that orchestrates
 * inbox durability, LLM processing, and SmartHole notifications.
 */

// Type Definitions
export type {
  MessageProcessorConfig,
  ProcessResult,
  ResponseCallback,
  MessageReceivedCallback,
} from "./types";

// Processor Class
export { MessageProcessor } from "./MessageProcessor";
