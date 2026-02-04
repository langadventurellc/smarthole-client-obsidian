/**
 * createFolder Tool
 *
 * Creates a folder in the vault. Parent directories are created automatically
 * if they don't exist. Blocks creation in protected directories.
 */

import type { App } from "obsidian";
import type { ToolHandler } from "../LLMService";
import type { Tool } from "../types";
import { assertNotProtected } from "./protected";

const toolDefinition: Tool = {
  name: "create_folder",
  description:
    "Create a folder in the vault. Parent directories are created automatically if they don't exist.",
  inputSchema: {
    type: "object",
    properties: {
      path: {
        type: "string",
        description: "Path to the folder to create (e.g., 'folder/subfolder').",
      },
    },
    required: ["path"],
  },
};

function normalizeFolderPath(path: string): string {
  let normalized = path.trim();
  normalized = normalized.replace(/^\/+/, "");
  normalized = normalized.replace(/\/+$/, "");
  return normalized;
}

/**
 * Creates a ToolHandler for the create_folder tool.
 *
 * @param app - The Obsidian App instance for vault access
 * @returns A ToolHandler that can be registered with LLMService
 */
export function createCreateFolderTool(app: App): ToolHandler {
  return {
    definition: toolDefinition,
    execute: async (input: Record<string, unknown>): Promise<string> => {
      const pathInput = input.path as string;

      // Validate path input
      if (!pathInput || typeof pathInput !== "string") {
        return "Error: path is required and must be a string.";
      }

      // Normalize path
      const folderPath = normalizeFolderPath(pathInput);

      // Check for empty/root path after normalization
      if (folderPath.length === 0) {
        return "Error: path cannot be empty or root.";
      }

      // Check protected path - throws if protected
      try {
        assertNotProtected(folderPath);
      } catch (error) {
        return error instanceof Error ? `Error: ${error.message}` : "Error: Access denied.";
      }

      // Check if folder already exists
      const existingFolder = app.vault.getFolderByPath(folderPath);
      if (existingFolder) {
        return `Folder "${folderPath}" already exists.`;
      }

      // Create folder (automatically creates parent directories)
      try {
        await app.vault.createFolder(folderPath);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
        return `Error: Failed to create folder "${folderPath}": ${errorMessage}`;
      }

      return `Created folder "${folderPath}".`;
    },
  };
}
