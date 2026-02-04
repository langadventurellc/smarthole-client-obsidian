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
  ];
}

// Re-export individual factory functions for selective use
export { createCreateNoteTool } from "./createNote";
export { createModifyNoteTool } from "./modifyNote";
export { createSearchNotesTool } from "./searchNotes";
export { createOrganizeNoteTool } from "./organizeNotes";
export { createReadFileTool } from "./readFile";
