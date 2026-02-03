/**
 * organizeNotes Tool
 *
 * Renames and moves notes within the vault. Supports renaming notes
 * and moving them between folders.
 */

import type { App } from "obsidian";
import type { ToolHandler } from "../LLMService";
import type { Tool } from "../types";

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

const toolDefinition: Tool = {
  name: "organize_note",
  description:
    "Rename or move a note within the vault. Can rename a note in place, move it to a different folder, or both. The destination folder will be created if it does not exist.",
  inputSchema: {
    type: "object",
    properties: {
      path: {
        type: "string",
        description: "Current path of the note to rename/move (e.g., 'folder/note.md').",
      },
      new_path: {
        type: "string",
        description:
          "New path for the note (e.g., 'new-folder/renamed-note.md'). Include the full path with filename.",
      },
    },
    required: ["path", "new_path"],
  },
};

/**
 * Creates a ToolHandler for the organize_note tool.
 *
 * @param app - The Obsidian App instance for vault access
 * @returns A ToolHandler that can be registered with LLMService
 */
export function createOrganizeNoteTool(app: App): ToolHandler {
  return {
    definition: toolDefinition,
    execute: async (input: Record<string, unknown>): Promise<string> => {
      const pathInput = input.path as string;
      const newPathInput = input.new_path as string;

      // Validate path input
      if (!pathInput || typeof pathInput !== "string" || pathInput.trim().length === 0) {
        return "Error: path is required and must be a non-empty string.";
      }

      // Validate new_path input
      if (!newPathInput || typeof newPathInput !== "string" || newPathInput.trim().length === 0) {
        return "Error: new_path is required and must be a non-empty string.";
      }

      const currentPath = normalizePath(pathInput);
      const newPath = normalizePath(newPathInput);

      // Check if paths are the same
      if (currentPath === newPath) {
        return `Error: new_path "${newPath}" is the same as the current path. No change needed.`;
      }

      // Get the source file
      const file = app.vault.getFileByPath(currentPath);
      if (!file) {
        return `Error: Note not found at "${currentPath}". Use search_notes to find existing notes.`;
      }

      // Check if target already exists
      const existingTarget = app.vault.getFileByPath(newPath);
      if (existingTarget) {
        return `Error: A note already exists at "${newPath}". Cannot overwrite existing note.`;
      }

      // Ensure destination folder exists
      await ensureParentFolder(app, newPath);

      // Rename/move the note
      await app.vault.rename(file, newPath);

      return `Successfully moved note from "${currentPath}" to "${newPath}".`;
    },
  };
}
