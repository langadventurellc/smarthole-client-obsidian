/**
 * createNote Tool
 *
 * Creates new markdown notes in the vault. Supports automatic filename
 * generation from content when path is not specified.
 */

import type { App } from "obsidian";
import type { ToolHandler } from "../LLMService";
import type { Tool } from "../types";

/**
 * Extracts a filename from note content.
 * Uses the first H1 heading if present, otherwise the first 50 characters.
 */
function generateFilename(content: string): string {
  // Try to extract first H1 heading
  const h1Match = content.match(/^#\s+(.+)$/m);
  if (h1Match) {
    const heading = h1Match[1].trim();
    // Sanitize: remove characters invalid in filenames
    const sanitized = heading.replace(/[\\/:*?"<>|]/g, "-").trim();
    if (sanitized.length > 0) {
      return sanitized.slice(0, 100); // Limit length
    }
  }

  // Fall back to first 50 characters of content
  const firstLine = content.split("\n")[0].trim();
  const textContent = firstLine.replace(/^#+\s*/, ""); // Remove any heading markers
  const sanitized = textContent.replace(/[\\/:*?"<>|]/g, "-").trim();

  if (sanitized.length === 0) {
    return `Note-${Date.now()}`;
  }

  return sanitized.slice(0, 50);
}

/**
 * Ensures the parent folder exists, creating it if necessary.
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
  name: "create_note",
  description:
    "Create a new markdown note in the vault. If no path is specified, a filename will be auto-generated from the content (using the first H1 heading or first 50 characters).",
  inputSchema: {
    type: "object",
    properties: {
      path: {
        type: "string",
        description:
          "Optional path where to create the note (e.g., 'folder/note.md'). If not provided, a filename will be auto-generated in the vault root.",
      },
      content: {
        type: "string",
        description: "The markdown content for the note.",
      },
    },
    required: ["content"],
  },
};

/**
 * Creates a ToolHandler for the create_note tool.
 *
 * @param app - The Obsidian App instance for vault access
 * @returns A ToolHandler that can be registered with LLMService
 */
export function createCreateNoteTool(app: App): ToolHandler {
  return {
    definition: toolDefinition,
    execute: async (input: Record<string, unknown>): Promise<string> => {
      const content = input.content as string;
      const pathInput = input.path as string | undefined;

      if (!content || typeof content !== "string") {
        return "Error: content is required and must be a string.";
      }

      // Determine the file path
      let filePath: string;
      if (pathInput && typeof pathInput === "string" && pathInput.trim().length > 0) {
        filePath = normalizePath(pathInput);
      } else {
        const filename = generateFilename(content);
        filePath = normalizePath(filename);
      }

      // Check if file already exists
      const existingFile = app.vault.getFileByPath(filePath);
      if (existingFile) {
        return `Error: A note already exists at "${filePath}". Use modify_note to update it.`;
      }

      // Ensure parent folder exists
      await ensureParentFolder(app, filePath);

      // Create the note
      await app.vault.create(filePath, content);

      return `Successfully created note at "${filePath}".`;
    },
  };
}
