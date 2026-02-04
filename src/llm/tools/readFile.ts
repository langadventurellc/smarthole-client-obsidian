/**
 * readFile Tool
 *
 * Reads file contents from the vault. Supports partial reads with line ranges
 * and handles large files with smart truncation.
 */

import type { App } from "obsidian";
import type { ToolHandler } from "../LLMService";
import type { Tool } from "../types";
import { findFileInsensitive } from "./pathUtils";
import { assertNotProtected } from "./protected";

/** Maximum lines to return before truncation */
const MAX_LINES = 2000;

/** Maximum characters to return before truncation (~100KB) */
const MAX_CHARS = 100_000;

const toolDefinition: Tool = {
  name: "read_file",
  description:
    "Read the contents of a file from the vault. Returns content with line numbers. Supports optional line range filtering for large files.",
  inputSchema: {
    type: "object",
    properties: {
      path: {
        type: "string",
        description: "Path to the file to read (e.g., 'folder/note.md').",
      },
      start_line: {
        type: "integer",
        description: "First line to read (1-indexed, inclusive). Defaults to 1.",
      },
      end_line: {
        type: "integer",
        description: "Last line to read (1-indexed, inclusive). Defaults to last line.",
      },
    },
    required: ["path"],
  },
};

/**
 * Formats file content with line numbers.
 *
 * @param lines - Array of content lines
 * @param startLine - Starting line number (1-indexed) for numbering
 * @returns Formatted content with line numbers
 */
function formatWithLineNumbers(lines: string[], startLine: number): string {
  return lines.map((line, index) => `${startLine + index}: ${line}`).join("\n");
}

/**
 * Creates a ToolHandler for the read_file tool.
 *
 * @param app - The Obsidian App instance for vault access
 * @returns A ToolHandler that can be registered with LLMService
 */
export function createReadFileTool(app: App): ToolHandler {
  return {
    definition: toolDefinition,
    execute: async (input: Record<string, unknown>): Promise<string> => {
      const pathInput = input.path as string;
      const startLineInput = input.start_line as number | undefined;
      const endLineInput = input.end_line as number | undefined;

      // Validate path
      if (!pathInput || typeof pathInput !== "string" || pathInput.trim().length === 0) {
        return "Error: path is required and must be a non-empty string.";
      }

      const filePath = pathInput.trim();

      // Check protected path - throws if protected
      try {
        assertNotProtected(filePath);
      } catch (error) {
        return error instanceof Error ? `Error: ${error.message}` : "Error: Access denied.";
      }

      // Get the file (case-insensitive lookup for speech-to-text usability)
      const result = findFileInsensitive(app, filePath);
      if (result.ambiguous) {
        return `Error: Multiple files match "${filePath}" with different casing. Please specify the exact path.`;
      }
      if (!result.item) {
        return `Error: File not found: "${filePath}"`;
      }
      const file = result.item;

      // Read file content
      const content = await app.vault.read(file);
      const allLines = content.split("\n");
      const totalLines = allLines.length;

      // Determine line range
      const startLine = startLineInput !== undefined ? Math.max(1, startLineInput) : 1;
      const endLine = endLineInput !== undefined ? Math.min(totalLines, endLineInput) : totalLines;

      // Validate line range
      if (startLine > totalLines) {
        return `Error: start_line (${startLine}) exceeds total lines (${totalLines}) in file.`;
      }

      if (endLine < startLine) {
        return `Error: end_line (${endLine}) must be greater than or equal to start_line (${startLine}).`;
      }

      // Extract requested lines (convert to 0-indexed)
      const requestedLines = allLines.slice(startLine - 1, endLine);
      const requestedLineCount = requestedLines.length;

      // Check if truncation is needed
      let finalLines = requestedLines;
      let actualEndLine = endLine;
      let truncated = false;

      // Check line count limit
      if (requestedLineCount > MAX_LINES) {
        finalLines = requestedLines.slice(0, MAX_LINES);
        actualEndLine = startLine + MAX_LINES - 1;
        truncated = true;
      }

      // Check character count limit
      const formattedContent = formatWithLineNumbers(finalLines, startLine);
      if (formattedContent.length > MAX_CHARS) {
        // Find how many lines fit within the character limit
        let charCount = 0;
        let lineCount = 0;
        for (const line of finalLines) {
          const lineWithNumber = `${startLine + lineCount}: ${line}\n`;
          if (charCount + lineWithNumber.length > MAX_CHARS) {
            break;
          }
          charCount += lineWithNumber.length;
          lineCount++;
        }

        if (lineCount === 0) {
          // First line itself is too long, include partial
          lineCount = 1;
        }

        finalLines = finalLines.slice(0, lineCount);
        actualEndLine = startLine + lineCount - 1;
        truncated = true;
      }

      // Format output
      const output = formatWithLineNumbers(finalLines, startLine);

      // Add truncation notice if needed
      if (truncated) {
        const rangeInfo =
          startLineInput !== undefined || endLineInput !== undefined
            ? ` of requested range ${startLine}-${endLine}`
            : "";
        return `${output}\n\n[... truncated, showing lines ${startLine}-${actualEndLine}${rangeInfo}, total lines in file: ${totalLines}]`;
      }

      // Add file info for context
      if (startLineInput !== undefined || endLineInput !== undefined) {
        return `${output}\n\n[Showing lines ${startLine}-${endLine} of ${totalLines} total]`;
      }

      return output;
    },
  };
}
