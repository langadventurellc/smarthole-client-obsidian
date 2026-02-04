/**
 * writeFile Tool
 *
 * Writes content to a file in the vault, creating it if it doesn't exist
 * or overwriting if it does. Supports auto-creation of parent directories.
 */

import type { App } from "obsidian";
import type { ToolHandler } from "../LLMService";
import type { Tool } from "../types";
import { assertNotProtected } from "./protected";

const toolDefinition: Tool = {
  name: "write_file",
  description:
    "Write content to a file, creating it if it doesn't exist or overwriting if it does. Parent directories are created automatically.",
  inputSchema: {
    type: "object",
    properties: {
      path: {
        type: "string",
        description: "Path to the file to write (e.g., 'folder/file.md').",
      },
      content: {
        type: "string",
        description: "Content to write to the file.",
      },
    },
    required: ["path", "content"],
  },
};

function formatSize(bytes: number): string {
  if (bytes < 1024) {
    return `${bytes} bytes`;
  }
  const kb = bytes / 1024;
  return `${kb.toFixed(1)} KB`;
}

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
 * Creates a ToolHandler for the write_file tool.
 *
 * @param app - The Obsidian App instance for vault access
 * @returns A ToolHandler that can be registered with LLMService
 */
export function createWriteFileTool(app: App): ToolHandler {
  return {
    definition: toolDefinition,
    execute: async (input: Record<string, unknown>): Promise<string> => {
      const pathInput = input.path as string;
      const contentInput = input.content as string;

      // Validate path
      if (!pathInput || typeof pathInput !== "string" || pathInput.trim().length === 0) {
        return "Error: path is required and must be a non-empty string.";
      }

      // Validate content (allow empty string, but must be a string)
      if (contentInput === undefined || contentInput === null || typeof contentInput !== "string") {
        return "Error: content is required and must be a string.";
      }

      const filePath = pathInput.trim();

      // Check protected path - throws if protected
      try {
        assertNotProtected(filePath);
      } catch (error) {
        return error instanceof Error ? `Error: ${error.message}` : "Error: Access denied.";
      }

      // Check if file already exists
      const existingFile = app.vault.getFileByPath(filePath);

      try {
        if (existingFile) {
          // Overwrite existing file
          await app.vault.modify(existingFile, contentInput);
        } else {
          // Create new file (ensure parent folder exists first)
          await ensureParentFolder(app, filePath);
          await app.vault.create(filePath, contentInput);
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
        return `Error: Failed to write file "${filePath}": ${errorMessage}`;
      }

      // Calculate size and format response
      const sizeBytes = new TextEncoder().encode(contentInput).length;
      const sizeFormatted = formatSize(sizeBytes);
      const action = existingFile ? "Overwrote" : "Created";

      return `${action} file "${filePath}" (${sizeFormatted}).`;
    },
  };
}
