/**
 * editFile Tool
 *
 * Edits files in the vault using search/replace or line-based operations.
 * Supports replacing text patterns or inserting/deleting lines by line number.
 */

import type { App, TFile } from "obsidian";
import type { ToolHandler } from "../LLMService";
import type { Tool } from "../types";
import { assertNotProtected } from "./protected";

const toolDefinition: Tool = {
  name: "edit_file",
  description:
    "Edit a file using search/replace OR line-based operations. For search/replace: provide old_text and new_text. For line operations: provide insert_after_line, insert_before_line, or delete_lines. Operations are mutually exclusive.",
  inputSchema: {
    type: "object",
    properties: {
      path: {
        type: "string",
        description: "Path to the file to edit (e.g., 'folder/note.md').",
      },
      old_text: {
        type: "string",
        description: "The text to search for and replace (search/replace mode).",
      },
      new_text: {
        type: "string",
        description: "The text to replace old_text with (search/replace mode).",
      },
      replace_all: {
        type: "boolean",
        description:
          "If true, replace all occurrences of old_text. Defaults to false (replace first occurrence only).",
      },
      insert_after_line: {
        type: "integer",
        description:
          "Line number after which to insert content (1-indexed, or 0 to insert at the very beginning). Requires content parameter.",
      },
      insert_before_line: {
        type: "integer",
        description:
          "Line number before which to insert content (1-indexed). Requires content parameter.",
      },
      delete_lines: {
        type: "object",
        description: "Line range to delete (1-indexed, inclusive).",
        properties: {
          start: {
            type: "integer",
            description: "First line to delete (1-indexed).",
          },
          end: {
            type: "integer",
            description: "Last line to delete (1-indexed, inclusive).",
          },
        },
        required: ["start", "end"],
      },
      content: {
        type: "string",
        description: "Content to insert (required for insert_after_line and insert_before_line).",
      },
    },
    required: ["path"],
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

/** Interface for delete_lines parameter */
interface DeleteLinesInput {
  start: number;
  end: number;
}

/**
 * Determines the operation mode based on input parameters.
 * Returns 'search_replace', 'line_based', 'none', or 'conflict'.
 */
function determineOperationMode(input: Record<string, unknown>): string {
  const hasSearchReplace = input.old_text !== undefined || input.new_text !== undefined;
  const hasLineBased =
    input.insert_after_line !== undefined ||
    input.insert_before_line !== undefined ||
    input.delete_lines !== undefined;

  if (hasSearchReplace && hasLineBased) {
    return "conflict";
  }
  if (hasSearchReplace) {
    return "search_replace";
  }
  if (hasLineBased) {
    return "line_based";
  }
  return "none";
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

      // Validate path
      if (!pathInput || typeof pathInput !== "string" || pathInput.trim().length === 0) {
        return "Error: path is required and must be a non-empty string.";
      }

      const filePath = pathInput.trim();
      const filename = getFilename(filePath);

      // Determine operation mode
      const mode = determineOperationMode(input);

      if (mode === "conflict") {
        return "Error: Cannot mix search/replace parameters (old_text, new_text) with line-based parameters (insert_after_line, insert_before_line, delete_lines). Use one mode at a time.";
      }

      if (mode === "none") {
        return "Error: Must provide either search/replace parameters (old_text, new_text) or line-based parameters (insert_after_line, insert_before_line, delete_lines).";
      }

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

      // Handle search/replace mode
      if (mode === "search_replace") {
        return executeSearchReplace(app, file, input, filePath, filename);
      }

      // Handle line-based mode
      return executeLineBased(app, file, input, filePath);
    },
  };
}

/**
 * Execute search/replace operation.
 */
async function executeSearchReplace(
  app: App,
  file: TFile,
  input: Record<string, unknown>,
  filePath: string,
  filename: string
): Promise<string> {
  const oldText = input.old_text as string;
  const newText = input.new_text as string;
  const replaceAllFlag = input.replace_all as boolean | undefined;

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

  // Track the number of replacements made
  let replacementCount = 0;

  // Perform atomic modification using vault.process()
  await app.vault.process(file, (existingContent: string): string => {
    // Check if old_text exists in the content
    const occurrences = countOccurrences(existingContent, oldText);

    if (occurrences === 0) {
      // Text not found - return unchanged content
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
}

/**
 * Execute line-based operation.
 */
async function executeLineBased(
  app: App,
  file: TFile,
  input: Record<string, unknown>,
  filePath: string
): Promise<string> {
  const insertAfterLine = input.insert_after_line as number | undefined;
  const insertBeforeLine = input.insert_before_line as number | undefined;
  const deleteLines = input.delete_lines as DeleteLinesInput | undefined;
  const content = input.content as string | undefined;

  // Count how many line operations are specified
  const operationCount = [insertAfterLine, insertBeforeLine, deleteLines].filter(
    (op) => op !== undefined
  ).length;

  if (operationCount > 1) {
    return "Error: Only one line-based operation can be specified at a time (insert_after_line, insert_before_line, or delete_lines).";
  }

  // Handle insert_after_line
  if (insertAfterLine !== undefined) {
    return executeInsertAfterLine(app, file, insertAfterLine, content, filePath);
  }

  // Handle insert_before_line
  if (insertBeforeLine !== undefined) {
    return executeInsertBeforeLine(app, file, insertBeforeLine, content, filePath);
  }

  // Handle delete_lines
  if (deleteLines !== undefined) {
    return executeDeleteLines(app, file, deleteLines, filePath);
  }

  return "Error: No line-based operation specified.";
}

/**
 * Execute insert_after_line operation.
 */
async function executeInsertAfterLine(
  app: App,
  file: TFile,
  lineNumber: number,
  content: string | undefined,
  filePath: string
): Promise<string> {
  // Validate content is provided
  if (content === undefined || content === null || typeof content !== "string") {
    return "Error: content is required for insert operations.";
  }

  // Validate line number is a positive integer
  if (!Number.isInteger(lineNumber) || lineNumber < 0) {
    return "Error: insert_after_line must be a non-negative integer.";
  }

  let totalLines = 0;
  let insertedLineCount = 0;
  let success = false;

  await app.vault.process(file, (existingContent: string): string => {
    const lines = existingContent.split("\n");
    totalLines = lines.length;

    // Line 0 means insert at the very beginning (before all lines)
    // Line N means insert after line N
    if (lineNumber > totalLines) {
      success = false;
      return existingContent;
    }

    const newLines = content.split("\n");
    insertedLineCount = newLines.length;

    // Insert after the specified line
    const resultLines = [...lines.slice(0, lineNumber), ...newLines, ...lines.slice(lineNumber)];

    success = true;
    return resultLines.join("\n");
  });

  if (!success) {
    return `Error: Line ${lineNumber} does not exist in file with ${totalLines} lines.`;
  }

  const lineWord = insertedLineCount === 1 ? "line" : "lines";
  return `Inserted ${insertedLineCount} ${lineWord} after line ${lineNumber} in "${filePath}".`;
}

/**
 * Execute insert_before_line operation.
 */
async function executeInsertBeforeLine(
  app: App,
  file: TFile,
  lineNumber: number,
  content: string | undefined,
  filePath: string
): Promise<string> {
  // Validate content is provided
  if (content === undefined || content === null || typeof content !== "string") {
    return "Error: content is required for insert operations.";
  }

  // Validate line number is a positive integer (1-indexed, minimum 1)
  if (!Number.isInteger(lineNumber) || lineNumber < 1) {
    return "Error: insert_before_line must be a positive integer (1-indexed).";
  }

  let totalLines = 0;
  let insertedLineCount = 0;
  let success = false;

  await app.vault.process(file, (existingContent: string): string => {
    const lines = existingContent.split("\n");
    totalLines = lines.length;

    // Check if line number is valid (1-indexed)
    if (lineNumber > totalLines) {
      success = false;
      return existingContent;
    }

    const newLines = content.split("\n");
    insertedLineCount = newLines.length;

    // Convert to 0-indexed and insert before the specified line
    const insertIndex = lineNumber - 1;
    const resultLines = [...lines.slice(0, insertIndex), ...newLines, ...lines.slice(insertIndex)];

    success = true;
    return resultLines.join("\n");
  });

  if (!success) {
    return `Error: Line ${lineNumber} does not exist in file with ${totalLines} lines.`;
  }

  const lineWord = insertedLineCount === 1 ? "line" : "lines";
  return `Inserted ${insertedLineCount} ${lineWord} before line ${lineNumber} in "${filePath}".`;
}

/**
 * Execute delete_lines operation.
 */
async function executeDeleteLines(
  app: App,
  file: TFile,
  deleteLines: DeleteLinesInput,
  filePath: string
): Promise<string> {
  const { start, end } = deleteLines;

  // Validate start and end are positive integers
  if (!Number.isInteger(start) || start < 1) {
    return "Error: delete_lines.start must be a positive integer (1-indexed).";
  }

  if (!Number.isInteger(end) || end < 1) {
    return "Error: delete_lines.end must be a positive integer (1-indexed).";
  }

  // Validate end >= start
  if (end < start) {
    return "Error: delete_lines.end must be >= delete_lines.start.";
  }

  let totalLines = 0;
  let deletedLineCount = 0;
  let success = false;
  let errorType: "start" | "end" | null = null;

  await app.vault.process(file, (existingContent: string): string => {
    const lines = existingContent.split("\n");
    totalLines = lines.length;

    // Check if start line is valid (1-indexed)
    if (start > totalLines) {
      success = false;
      errorType = "start";
      return existingContent;
    }

    // Check if end line is valid (1-indexed)
    if (end > totalLines) {
      success = false;
      errorType = "end";
      return existingContent;
    }

    // Convert to 0-indexed and delete lines
    const startIndex = start - 1;
    const endIndex = end; // end is exclusive in slice, but we want inclusive, so we use end (1-indexed = 0-indexed + 1)

    deletedLineCount = end - start + 1;

    const resultLines = [...lines.slice(0, startIndex), ...lines.slice(endIndex)];

    success = true;
    return resultLines.join("\n");
  });

  if (!success) {
    if (errorType === "start") {
      return `Error: Line ${start} does not exist in file with ${totalLines} lines.`;
    }
    if (errorType === "end") {
      return `Error: Line ${end} does not exist in file with ${totalLines} lines.`;
    }
    return `Error: Invalid line range.`;
  }

  return `Deleted lines ${start}-${end} (${deletedLineCount} ${deletedLineCount === 1 ? "line" : "lines"}) in "${filePath}".`;
}
