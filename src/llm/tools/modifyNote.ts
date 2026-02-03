/**
 * modifyNote Tool
 *
 * Modifies existing notes in the vault with atomic read-modify-write operations.
 * Supports append, prepend, and replace operations.
 */

import type { App } from "obsidian";
import type { ToolHandler } from "../LLMService";
import type { Tool } from "../types";

/** Valid operations for modifying notes */
type ModifyOperation = "append" | "prepend" | "replace";

const VALID_OPERATIONS: readonly ModifyOperation[] = ["append", "prepend", "replace"];

/**
 * Normalizes a file path to ensure it has .md extension.
 */
function normalizePath(path: string): string {
  const trimmed = path.trim();
  if (!trimmed.toLowerCase().endsWith(".md")) {
    return `${trimmed}.md`;
  }
  return trimmed;
}

const toolDefinition: Tool = {
  name: "modify_note",
  description:
    "Modify an existing note in the vault. Supports appending content to the end, prepending content to the beginning, or replacing the entire content.",
  inputSchema: {
    type: "object",
    properties: {
      path: {
        type: "string",
        description: "Path to the note to modify (e.g., 'folder/note.md').",
      },
      operation: {
        type: "string",
        enum: ["append", "prepend", "replace"],
        description:
          "The modification operation: 'append' adds content to the end, 'prepend' adds content to the beginning, 'replace' replaces the entire content.",
      },
      content: {
        type: "string",
        description: "The content to add or replace with.",
      },
    },
    required: ["path", "operation", "content"],
  },
};

/**
 * Creates a ToolHandler for the modify_note tool.
 *
 * @param app - The Obsidian App instance for vault access
 * @returns A ToolHandler that can be registered with LLMService
 */
export function createModifyNoteTool(app: App): ToolHandler {
  return {
    definition: toolDefinition,
    execute: async (input: Record<string, unknown>): Promise<string> => {
      const pathInput = input.path as string;
      const operation = input.operation as string;
      const content = input.content as string;

      // Validate inputs
      if (!pathInput || typeof pathInput !== "string" || pathInput.trim().length === 0) {
        return "Error: path is required and must be a non-empty string.";
      }

      if (!operation || typeof operation !== "string") {
        return "Error: operation is required and must be a string.";
      }

      if (!VALID_OPERATIONS.includes(operation as ModifyOperation)) {
        return `Error: operation must be one of: ${VALID_OPERATIONS.join(", ")}. Got: "${operation}".`;
      }

      if (content === undefined || content === null || typeof content !== "string") {
        return "Error: content is required and must be a string.";
      }

      const filePath = normalizePath(pathInput);

      // Get the file
      const file = app.vault.getFileByPath(filePath);
      if (!file) {
        return `Error: Note not found at "${filePath}". Use create_note to create a new note, or search_notes to find existing notes.`;
      }

      // Perform atomic modification using vault.process()
      await app.vault.process(file, (existingContent: string): string => {
        switch (operation as ModifyOperation) {
          case "append":
            // Add newline separator if existing content doesn't end with one
            if (existingContent.length > 0 && !existingContent.endsWith("\n")) {
              return `${existingContent}\n${content}`;
            }
            return `${existingContent}${content}`;

          case "prepend":
            // Add newline separator if content doesn't end with one
            if (content.length > 0 && !content.endsWith("\n")) {
              return `${content}\n${existingContent}`;
            }
            return `${content}${existingContent}`;

          case "replace":
            return content;

          default:
            // TypeScript should prevent this, but handle gracefully
            return existingContent;
        }
      });

      // Generate operation-specific confirmation message
      const operationDescriptions: Record<ModifyOperation, string> = {
        append: "appended content to",
        prepend: "prepended content to",
        replace: "replaced content in",
      };

      return `Successfully ${operationDescriptions[operation as ModifyOperation]} "${filePath}".`;
    },
  };
}
