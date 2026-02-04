/**
 * deleteFile Tool
 *
 * Soft-deletes files and folders to Obsidian's trash. Respects user's
 * trash settings (system trash vs local .trash folder).
 */

import type { App } from "obsidian";
import type { ToolHandler } from "../LLMService";
import type { Tool } from "../types";
import { assertNotProtected } from "./protected";

const toolDefinition: Tool = {
  name: "delete_file",
  description: "Soft-delete a file or folder to Obsidian's trash. Respects user's trash settings.",
  inputSchema: {
    type: "object",
    properties: {
      path: {
        type: "string",
        description: "Path to the file or folder to delete (e.g., 'folder/note.md' or 'folder').",
      },
    },
    required: ["path"],
  },
};

/**
 * Creates a ToolHandler for the delete_file tool.
 *
 * @param app - The Obsidian App instance for vault access
 * @returns A ToolHandler that can be registered with LLMService
 */
export function createDeleteFileTool(app: App): ToolHandler {
  return {
    definition: toolDefinition,
    execute: async (input: Record<string, unknown>): Promise<string> => {
      const pathInput = input.path as string;

      // Validate path
      if (!pathInput || typeof pathInput !== "string" || pathInput.trim().length === 0) {
        return "Error: path is required and must be a non-empty string.";
      }

      const targetPath = pathInput.trim();

      // Check protected path - throws if protected
      try {
        assertNotProtected(targetPath);
      } catch (error) {
        return error instanceof Error ? `Error: ${error.message}` : "Error: Access denied.";
      }

      // Get the file or folder
      const abstractFile = app.vault.getAbstractFileByPath(targetPath);
      if (!abstractFile) {
        return `Error: File or folder not found: "${targetPath}"`;
      }

      // Determine if we should use system trash based on user settings
      // trashOption can be 'system', 'local', or 'none'
      // We use system trash only when explicitly set to 'system'
      // Note: vault.config is an internal Obsidian property not exposed in types
      const vault = app.vault as unknown as { config?: { trashOption?: string } };
      const useSystemTrash = vault.config?.trashOption === "system";

      try {
        await app.vault.trash(abstractFile, useSystemTrash);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
        return `Error: Failed to delete "${targetPath}": ${errorMessage}`;
      }

      return `Deleted '${targetPath}' to trash.`;
    },
  };
}
