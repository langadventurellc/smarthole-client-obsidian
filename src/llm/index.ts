/**
 * LLM Module
 *
 * Public exports for LLM provider abstraction and tool calling.
 */

// Provider Interface and Implementation
export type { LLMProvider } from "./types";
export { AnthropicProvider } from "./AnthropicProvider";

// Service Layer
export { LLMService } from "./LLMService";
export type { ToolHandler } from "./LLMService";

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

// Vault Tools
export { createVaultTools } from "./tools";

// Send Message Tool (separate from vault tools - requires runtime context)
export { createSendMessageTool } from "./tools";
export type { SendMessageContext, SendMessageInput } from "./tools";

// End Conversation Tool (separate from vault tools - requires runtime context)
export { createEndConversationTool } from "./tools";
export type { EndConversationContext, EndConversationInput } from "./tools";

// Get Conversation Tool (separate from vault tools - requires runtime context)
export { createGetConversationTool } from "./tools";
export type { GetConversationContext, GetConversationInput } from "./tools";

// Git Tools (conditionally registered when git is enabled)
export { createGitTools } from "./tools";
