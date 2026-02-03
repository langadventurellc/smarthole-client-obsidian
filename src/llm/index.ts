/**
 * LLM Module
 *
 * Public exports for LLM provider abstraction and tool calling.
 */

// Provider Interface
export type { LLMProvider } from "./types";

// Message Types
export type { LLMMessage, MessageRole, ContentBlock } from "./types";

// Content Block Types
export type { TextContentBlock, ToolUseContentBlock, ToolResultContentBlock } from "./types";

// Tool Types
export type { Tool, ToolInputSchema, ToolCall, ToolResult } from "./types";

// Response Types
export type { LLMResponse, LLMUsage, StopReason } from "./types";

// Error Types
export type { LLMErrorCode } from "./types";
export { LLMError } from "./types";

// Type Guards and Utilities
export {
  isTextContentBlock,
  isToolUseContentBlock,
  isToolResultContentBlock,
  extractToolCalls,
  extractTextContent,
} from "./types";
