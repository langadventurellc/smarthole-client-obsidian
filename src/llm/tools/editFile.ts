/**
 * editFile Tool
 *
 * Edits files in the vault using search/replace operations.
 * Supports replacing first occurrence or all occurrences of a text pattern.
 */

import type { App } from "obsidian";
import type { ToolHandler } from "../LLMService";
import type { Tool } from "../types";
import { assertNotProtected } from "./protected";

const toolDefinition: Tool = {
  name: "edit_file",
  description:
    "Edit a file by replacing text. Replaces the first occurrence of old_text with new_text by default. Set replace_all to true to replace all occurrences.",
  inputSchema: {
    type: "object",
    properties: {
      path: {
        type: "string",
        description: "Path to the file to edit (e.g., 'folder/note.md').",
      },
      old_text: {
        type: "string",
        description: "The text to search for and replace.",
      },
      new_text: {
        type: "string",
        description: "The text to replace old_text with.",
      },
      replace_all: {
        type: "boolean",
        description:
          "If true, replace all occurrences of old_text. Defaults to false (replace first occurrence only).",
      },
    },
    required: ["path", "old_text", "new_text"],
  },
};

function countOccurrences(content: string, search: string): number {
  if (search.length === 0) return 0;

  let count = 0;
  let position = 0;

  while ((position = content.indexOf(search, position)) !== -1) {
    count++;
    position += search.length;
  }

  return count;
}

function replaceFirst(content: string, search: string, replacement: string): string {
  const index = content.indexOf(search);
  if (index === -1) return content;
  return content.slice(0, index) + replacement + content.slice(index + search.length);
}

function replaceAll(content: string, search: string, replacement: string): string {
  if (search.length === 0) return content;

  let result = "";
  let position = 0;
  let lastPosition = 0;

  while ((position = content.indexOf(search, lastPosition)) !== -1) {
    result += content.slice(lastPosition, position) + replacement;
    lastPosition = position + search.length;
  }

  result += content.slice(lastPosition);
  return result;
}

function getFilename(path: string): string {
  const lastSlash = path.lastIndexOf("/");
  return lastSlash === -1 ? path : path.slice(lastSlash + 1);
}

/**
 * Creates a ToolHandler for the edit_file tool.
 *
 * @param app - The Obsidian App instance for vault access
 * @returns A ToolHandler that can be registered with LLMService
 */
export function createEditFileTool(app: App): ToolHandler {
  return {
    definition: toolDefinition,
    execute: async (input: Record<string, unknown>): Promise<string> => {
      const pathInput = input.path as string;
      const oldText = input.old_text as string;
      const newText = input.new_text as string;
      const replaceAllFlag = input.replace_all as boolean | undefined;

      // Validate path
      if (!pathInput || typeof pathInput !== "string" || pathInput.trim().length === 0) {
        return "Error: path is required and must be a non-empty string.";
      }

      // Validate old_text
      if (oldText === undefined || oldText === null || typeof oldText !== "string") {
        return "Error: old_text is required and must be a string.";
      }

      if (oldText.length === 0) {
        return "Error: old_text cannot be empty.";
      }

      // Validate new_text
      if (newText === undefined || newText === null || typeof newText !== "string") {
        return "Error: new_text is required and must be a string.";
      }

      const filePath = pathInput.trim();
      const filename = getFilename(filePath);

      // Check protected path - throws if protected
      try {
        assertNotProtected(filePath);
      } catch (error) {
        return error instanceof Error ? `Error: ${error.message}` : "Error: Access denied.";
      }

      // Get the file
      const file = app.vault.getFileByPath(filePath);
      if (!file) {
        return `Error: File not found: "${filePath}"`;
      }

      // Track the number of replacements made
      let replacementCount = 0;

      // Perform atomic modification using vault.process()
      await app.vault.process(file, (existingContent: string): string => {
        // Check if old_text exists in the content
        const occurrences = countOccurrences(existingContent, oldText);

        if (occurrences === 0) {
          // Text not found - return unchanged content
          // We'll detect this outside and return an error
          replacementCount = 0;
          return existingContent;
        }

        if (replaceAllFlag) {
          replacementCount = occurrences;
          return replaceAll(existingContent, oldText, newText);
        } else {
          replacementCount = 1;
          return replaceFirst(existingContent, oldText, newText);
        }
      });

      // Check if any replacements were made
      if (replacementCount === 0) {
        return `Error: Text '${oldText}' not found in ${filename}`;
      }

      // Generate success message with proper plural form
      const occurrenceWord = replacementCount === 1 ? "occurrence" : "occurrences";
      return `Replaced ${replacementCount} ${occurrenceWord} in "${filePath}".`;
    },
  };
}
