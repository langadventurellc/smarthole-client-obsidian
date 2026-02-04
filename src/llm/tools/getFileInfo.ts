/**
 * getFileInfo Tool
 *
 * Retrieves file/folder metadata (creation date, modification date, size)
 * without reading file contents.
 */

import type { App } from "obsidian";
import type { ToolHandler } from "../LLMService";
import type { Tool } from "../types";
import { assertNotProtected } from "./protected";

const toolDefinition: Tool = {
  name: "get_file_info",
  description:
    "Get metadata about a file or folder including creation date, modification date, and size.",
  inputSchema: {
    type: "object",
    properties: {
      path: {
        type: "string",
        description: "Path to the file or folder (e.g., 'folder/note.md' or 'folder').",
      },
    },
    required: ["path"],
  },
};

function formatBytes(bytes: number): string {
  const rawFormatted = bytes.toLocaleString();

  if (bytes < 1024) {
    return `${bytes} bytes`;
  }

  if (bytes < 1024 * 1024) {
    const kb = bytes / 1024;
    return `${kb.toFixed(1)} KB (${rawFormatted} bytes)`;
  }

  const mb = bytes / (1024 * 1024);
  return `${mb.toFixed(1)} MB (${rawFormatted} bytes)`;
}

function formatDate(timestamp: number): string {
  const date = new Date(timestamp);

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  const seconds = String(date.getSeconds()).padStart(2, "0");

  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}

/**
 * Creates a ToolHandler for the get_file_info tool.
 *
 * @param app - The Obsidian App instance for vault access
 * @returns A ToolHandler that can be registered with LLMService
 */
export function createGetFileInfoTool(app: App): ToolHandler {
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

      // Get file/folder metadata using adapter.stat()
      const stat = await app.vault.adapter.stat(targetPath);

      if (!stat) {
        return `Error: Path not found: "${targetPath}"`;
      }

      // Format output based on type
      if (stat.type === "folder") {
        return [
          `Folder: ${targetPath}/`,
          `Type: folder`,
          `Created: ${formatDate(stat.ctime)}`,
          `Modified: ${formatDate(stat.mtime)}`,
        ].join("\n");
      }

      // File
      return [
        `File: ${targetPath}`,
        `Type: file`,
        `Size: ${formatBytes(stat.size)}`,
        `Created: ${formatDate(stat.ctime)}`,
        `Modified: ${formatDate(stat.mtime)}`,
      ].join("\n");
    },
  };
}
