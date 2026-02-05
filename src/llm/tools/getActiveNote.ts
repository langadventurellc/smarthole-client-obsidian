/**
 * getActiveNote Tool
 *
 * Returns metadata about the file currently open in Obsidian's editor.
 * Useful when the user refers to "this note", "the current file", or
 * wants to operate on what they're looking at.
 */

import type { App } from "obsidian";
import type { ToolHandler } from "../LLMService";
import type { Tool } from "../types";

const toolDefinition: Tool = {
  name: "get_active_note",
  description:
    "Get the path and metadata of the file currently open in the editor. Returns the file path, name, and modification date. Use this when the user refers to 'this note', 'the current file', or wants to operate on what they're looking at.",
  inputSchema: {
    type: "object",
    properties: {},
    required: [],
  },
};

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
 * Creates a ToolHandler for the get_active_note tool.
 *
 * @param app - The Obsidian App instance for workspace access
 * @returns A ToolHandler that can be registered with LLMService
 */
export function createGetActiveNoteTool(app: App): ToolHandler {
  return {
    definition: toolDefinition,
    execute: async (): Promise<string> => {
      const activeFile = app.workspace.getActiveFile();

      if (!activeFile) {
        return "No file is currently open. The user may be viewing settings, an empty workspace, or a non-file view.";
      }

      const stat = activeFile.stat;

      return [
        `Active file: ${activeFile.path}`,
        `Name: ${activeFile.name}`,
        `Modified: ${formatDate(stat.mtime)}`,
      ].join("\n");
    },
  };
}
