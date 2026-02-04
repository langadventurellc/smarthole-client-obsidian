/**
 * Vault Tools Module
 *
 * Exports tool factory functions for vault operations.
 * Each tool can be registered with LLMService using registerTool().
 */

import type { App } from "obsidian";
import type { ToolHandler } from "../LLMService";
import { createCreateNoteTool } from "./createNote";
import { createModifyNoteTool } from "./modifyNote";
import { createSearchNotesTool } from "./searchNotes";
import { createOrganizeNoteTool } from "./organizeNotes";
import { createReadFileTool } from "./readFile";
import { createEditFileTool } from "./editFile";
import { createWriteFileTool } from "./writeFile";
import { createCreateFolderTool } from "./createFolder";
import { createDeleteFileTool } from "./deleteFile";
import { createMoveFileTool } from "./moveFile";
import { createSearchFilesTool } from "./searchFiles";
import { createListFilesTool } from "./listFiles";
import { createGetFileInfoTool } from "./getFileInfo";

/**
 * Creates all vault tools for registration with LLMService.
 *
 * @param app - The Obsidian App instance for vault access
 * @returns Array of ToolHandlers for all vault operations
 */
export function createVaultTools(app: App): ToolHandler[] {
  return [
    createCreateNoteTool(app),
    createModifyNoteTool(app),
    createSearchNotesTool(app),
    createOrganizeNoteTool(app),
    createReadFileTool(app),
    createEditFileTool(app),
    createWriteFileTool(app),
    createCreateFolderTool(app),
    createDeleteFileTool(app),
    createMoveFileTool(app),
    createSearchFilesTool(app),
    createListFilesTool(app),
    createGetFileInfoTool(app),
  ];
}

// Re-export individual factory functions for selective use
export { createCreateNoteTool } from "./createNote";
export { createModifyNoteTool } from "./modifyNote";
export { createSearchNotesTool } from "./searchNotes";
export { createOrganizeNoteTool } from "./organizeNotes";
export { createReadFileTool } from "./readFile";
export { createEditFileTool } from "./editFile";
export { createWriteFileTool } from "./writeFile";
export { createCreateFolderTool } from "./createFolder";
export { createDeleteFileTool } from "./deleteFile";
export { createMoveFileTool } from "./moveFile";
export { createSearchFilesTool } from "./searchFiles";
export { createListFilesTool } from "./listFiles";
export { createGetFileInfoTool } from "./getFileInfo";
