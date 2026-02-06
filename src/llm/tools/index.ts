/**
 * Vault Tools Module
 *
 * Exports tool factory functions for vault operations.
 * Each tool can be registered with LLMService using registerTool().
 */

import type { App } from "obsidian";
import type { ToolHandler } from "../LLMService";
import { createReadFileTool } from "./readFile";
import { createEditFileTool } from "./editFile";
import { createWriteFileTool } from "./writeFile";
import { createCreateFolderTool } from "./createFolder";
import { createDeleteFileTool } from "./deleteFile";
import { createMoveFileTool } from "./moveFile";
import { createSearchFilesTool } from "./searchFiles";
import { createListFilesTool } from "./listFiles";
import { createGetFileInfoTool } from "./getFileInfo";
import { createGetActiveNoteTool } from "./getActiveNote";

/**
 * Creates all vault tools for registration with LLMService.
 *
 * @param app - The Obsidian App instance for vault access
 * @returns Array of ToolHandlers for all vault operations
 */
export function createVaultTools(app: App): ToolHandler[] {
  return [
    createReadFileTool(app),
    createEditFileTool(app),
    createWriteFileTool(app),
    createCreateFolderTool(app),
    createDeleteFileTool(app),
    createMoveFileTool(app),
    createSearchFilesTool(app),
    createListFilesTool(app),
    createGetFileInfoTool(app),
    createGetActiveNoteTool(app),
  ];
}

// Re-export individual factory functions for selective use
export { createReadFileTool } from "./readFile";
export { createEditFileTool } from "./editFile";
export { createWriteFileTool } from "./writeFile";
export { createCreateFolderTool } from "./createFolder";
export { createDeleteFileTool } from "./deleteFile";
export { createMoveFileTool } from "./moveFile";
export { createSearchFilesTool } from "./searchFiles";
export { createListFilesTool } from "./listFiles";
export { createGetFileInfoTool } from "./getFileInfo";
export { createGetActiveNoteTool } from "./getActiveNote";

// Send Message Tool (separate from vault tools - requires runtime context)
export { createSendMessageTool } from "./sendMessage";
export type { SendMessageContext, SendMessageInput } from "./sendMessage";

// End Conversation Tool (separate from vault tools - requires runtime context)
export { createEndConversationTool } from "./endConversation";
export type { EndConversationContext, EndConversationInput } from "./endConversation";

// Get Conversation Tool (separate from vault tools - requires runtime context)
export { createGetConversationTool } from "./getConversation";
export type { GetConversationContext, GetConversationInput } from "./getConversation";

// Git Tools (conditionally registered when git is enabled)
export { createGitTools } from "./git";
