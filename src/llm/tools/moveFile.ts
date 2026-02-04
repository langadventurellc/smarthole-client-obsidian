/**
 * moveFile Tool
 *
 * Moves or renames files and folders in the vault. Supports moving to different
 * directories with automatic parent directory creation.
 */

import type { App } from "obsidian";
import type { ToolHandler } from "../LLMService";
import type { Tool } from "../types";
import { assertNotProtected } from "./protected";

const toolDefinition: Tool = {
  name: "move_file",
  description:
    "Move or rename a file or folder. Moves to a new location or renames in place. Parent directories are created automatically if needed.",
  inputSchema: {
    type: "object",
    properties: {
      source: {
        type: "string",
        description: "Path to the file or folder to move (e.g., 'old-folder/note.md').",
      },
      destination: {
        type: "string",
        description: "New path for the file or folder (e.g., 'new-folder/renamed-note.md').",
      },
    },
    required: ["source", "destination"],
  },
};

/**
 * Normalizes a path for consistent comparison.
 * - Converts backslashes to forward slashes
 * - Removes leading and trailing slashes
 *
 * @param path - The path to normalize
 * @returns Normalized path string
 */
function normalizePath(path: string): string {
  let normalized = path.replace(/\\/g, "/");
  normalized = normalized.replace(/\/+$/, "");
  normalized = normalized.replace(/^\/+/, "");
  return normalized;
}

/**
 * Ensures the parent folder exists for a given file path.
 * Creates the folder hierarchy if needed.
 *
 * @param app - The Obsidian App instance
 * @param filePath - Path to the file whose parent folder should exist
 */
async function ensureParentFolder(app: App, filePath: string): Promise<void> {
  const lastSlash = filePath.lastIndexOf("/");
  if (lastSlash <= 0) {
    return; // No parent folder or root level
  }

  const folderPath = filePath.substring(0, lastSlash);
  const existingFolder = app.vault.getFolderByPath(folderPath);

  if (!existingFolder) {
    await app.vault.createFolder(folderPath);
  }
}

/**
 * Creates a ToolHandler for the move_file tool.
 *
 * @param app - The Obsidian App instance for vault access
 * @returns A ToolHandler that can be registered with LLMService
 */
export function createMoveFileTool(app: App): ToolHandler {
  return {
    definition: toolDefinition,
    execute: async (input: Record<string, unknown>): Promise<string> => {
      const sourceInput = input.source as string;
      const destinationInput = input.destination as string;

      // Validate source
      if (!sourceInput || typeof sourceInput !== "string" || sourceInput.trim().length === 0) {
        return "Error: source is required and must be a non-empty string.";
      }

      // Validate destination
      if (
        !destinationInput ||
        typeof destinationInput !== "string" ||
        destinationInput.trim().length === 0
      ) {
        return "Error: destination is required and must be a non-empty string.";
      }

      const sourcePath = normalizePath(sourceInput.trim());
      const destinationPath = normalizePath(destinationInput.trim());

      // Check if source and destination are the same after normalization
      if (sourcePath === destinationPath) {
        return `No changes made: source and destination are the same path ("${sourcePath}").`;
      }

      // Check protected paths for source - throws if protected
      try {
        assertNotProtected(sourcePath);
      } catch (error) {
        return error instanceof Error ? `Error: ${error.message}` : "Error: Access denied.";
      }

      // Check protected paths for destination - throws if protected
      try {
        assertNotProtected(destinationPath);
      } catch (error) {
        return error instanceof Error ? `Error: ${error.message}` : "Error: Access denied.";
      }

      // Verify source exists
      const sourceFile = app.vault.getAbstractFileByPath(sourcePath);
      if (!sourceFile) {
        return `Error: Source not found: "${sourcePath}"`;
      }

      // Check that destination doesn't already exist
      const existingDestination = app.vault.getAbstractFileByPath(destinationPath);
      if (existingDestination) {
        return `Error: Destination already exists: "${destinationPath}"`;
      }

      try {
        // Ensure parent directories exist for the destination
        await ensureParentFolder(app, destinationPath);

        // Perform the move/rename operation
        await app.fileManager.renameFile(sourceFile, destinationPath);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
        return `Error: Failed to move "${sourcePath}" to "${destinationPath}": ${errorMessage}`;
      }

      return `Moved "${sourcePath}" to "${destinationPath}".`;
    },
  };
}
