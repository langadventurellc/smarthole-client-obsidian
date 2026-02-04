/**
 * searchFiles Tool
 *
 * Searches file contents using regex patterns.
 * Returns matching file paths with excerpts showing context around matches.
 */

import type { App, TFile } from "obsidian";
import type { ToolHandler } from "../LLMService";
import type { Tool } from "../types";
import { isProtectedPath } from "./protected";

/** Default number of lines to show before/after a match */
const DEFAULT_CONTEXT_LINES = 2;

/** Default maximum number of files to return */
const DEFAULT_MAX_RESULTS = 10;

/** Maximum excerpts per file to prevent overwhelming output */
const MAX_EXCERPTS_PER_FILE = 5;

interface FileMatch {
  path: string;
  excerpts: MatchExcerpt[];
}

interface MatchExcerpt {
  /** 1-indexed */
  lineNumber: number;
  beforeLines: string[];
  matchLine: string;
  afterLines: string[];
}

/** Returns 0-indexed line numbers containing matches. Matches each line individually. */
function findMatchingLineNumbers(content: string, regex: RegExp): number[] {
  const lines = content.split("\n");
  const matchingLines: number[] = [];

  for (let i = 0; i < lines.length; i++) {
    // Reset regex state for each line (global flag maintains lastIndex)
    regex.lastIndex = 0;
    if (regex.test(lines[i])) {
      matchingLines.push(i);
    }
  }

  return matchingLines;
}

function extractMatchExcerpts(
  content: string,
  matchingLineNumbers: number[],
  contextLines: number
): MatchExcerpt[] {
  const lines = content.split("\n");
  const excerpts: MatchExcerpt[] = [];
  const processedLines = new Set<number>();

  for (const lineNum of matchingLineNumbers) {
    // Skip if we've already included this line in a previous excerpt's context
    if (processedLines.has(lineNum)) {
      continue;
    }

    // Stop if we've reached the excerpt limit
    if (excerpts.length >= MAX_EXCERPTS_PER_FILE) {
      break;
    }

    // Calculate context boundaries
    const startLine = Math.max(0, lineNum - contextLines);
    const endLine = Math.min(lines.length - 1, lineNum + contextLines);

    // Extract context lines
    const beforeLines: string[] = [];
    for (let i = startLine; i < lineNum; i++) {
      beforeLines.push(lines[i]);
    }

    const afterLines: string[] = [];
    for (let i = lineNum + 1; i <= endLine; i++) {
      afterLines.push(lines[i]);
    }

    excerpts.push({
      lineNumber: lineNum + 1, // Convert to 1-indexed
      beforeLines,
      matchLine: lines[lineNum],
      afterLines,
    });

    // Mark lines in this range as processed to avoid overlapping excerpts
    for (let i = startLine; i <= endLine; i++) {
      processedLines.add(i);
    }
  }

  return excerpts;
}

function formatExcerpt(excerpt: MatchExcerpt): string {
  const lines: string[] = [];

  // Before context lines
  const startLineNum = excerpt.lineNumber - excerpt.beforeLines.length;
  for (let i = 0; i < excerpt.beforeLines.length; i++) {
    lines.push(`Line ${startLineNum + i}:   ${excerpt.beforeLines[i]}`);
  }

  // Matching line (highlighted with >)
  lines.push(`Line ${excerpt.lineNumber}: > ${excerpt.matchLine}`);

  // After context lines
  for (let i = 0; i < excerpt.afterLines.length; i++) {
    lines.push(`Line ${excerpt.lineNumber + 1 + i}:   ${excerpt.afterLines[i]}`);
  }

  return lines.join("\n");
}

function formatResults(matches: FileMatch[]): string {
  if (matches.length === 0) {
    return "No files found matching the pattern.";
  }

  const lines: string[] = [`Found ${matches.length} matching file(s):\n`];

  for (const match of matches) {
    lines.push(`## ${match.path}`);

    for (const excerpt of match.excerpts) {
      lines.push(formatExcerpt(excerpt));
      lines.push(""); // Empty line between excerpts
    }
  }

  return lines.join("\n").trim();
}

async function searchFile(
  file: TFile,
  regex: RegExp,
  contextLines: number,
  app: App
): Promise<FileMatch | null> {
  // Skip protected paths
  if (isProtectedPath(file.path)) {
    return null;
  }

  const content = await app.vault.cachedRead(file);

  // Find all matching line numbers
  const matchingLineNumbers = findMatchingLineNumbers(content, regex);

  if (matchingLineNumbers.length === 0) {
    return null;
  }

  // Extract excerpts with context
  const excerpts = extractMatchExcerpts(content, matchingLineNumbers, contextLines);

  return {
    path: file.path,
    excerpts,
  };
}

const toolDefinition: Tool = {
  name: "search_files",
  description:
    "Search file contents using regex patterns. Returns matching file paths with excerpts showing context around matches. Note: Patterns are matched against individual lines, so multi-line patterns that span line breaks will not match.",
  inputSchema: {
    type: "object",
    properties: {
      pattern: {
        type: "string",
        description: "Regex pattern to search for in file contents.",
      },
      file_pattern: {
        type: "string",
        description:
          "Glob pattern to filter files (e.g., '*.md', 'Projects/**'). Currently searches all markdown files; glob filtering coming in a future update.",
      },
      context_lines: {
        type: "integer",
        description: "Number of lines to show before and after each match. Default is 2.",
      },
      max_results: {
        type: "integer",
        description: "Maximum number of files to return. Default is 10.",
      },
    },
    required: ["pattern"],
  },
};

/**
 * Creates a ToolHandler for the search_files tool.
 *
 * @param app - The Obsidian App instance for vault access
 * @returns A ToolHandler that can be registered with LLMService
 */
export function createSearchFilesTool(app: App): ToolHandler {
  return {
    definition: toolDefinition,
    execute: async (input: Record<string, unknown>): Promise<string> => {
      const patternInput = input.pattern as string;
      const contextLinesInput = input.context_lines as number | undefined;
      const maxResultsInput = input.max_results as number | undefined;
      // file_pattern is defined in schema but not implemented yet (glob filtering in follow-up task)

      // Validate pattern
      if (!patternInput || typeof patternInput !== "string" || patternInput.trim().length === 0) {
        return "Error: pattern is required and must be a non-empty string.";
      }

      const pattern = patternInput.trim();

      // Compile regex with error handling
      let regex: RegExp;
      try {
        regex = new RegExp(pattern, "g");
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unknown error";
        return `Error: Invalid regex pattern "${pattern}": ${message}`;
      }

      // Parse optional parameters with defaults
      const contextLines =
        contextLinesInput !== undefined && contextLinesInput >= 0
          ? contextLinesInput
          : DEFAULT_CONTEXT_LINES;

      const maxResults =
        maxResultsInput !== undefined && maxResultsInput > 0
          ? maxResultsInput
          : DEFAULT_MAX_RESULTS;

      // Get all markdown files (glob filtering will be added in follow-up task)
      const markdownFiles = app.vault.getMarkdownFiles();

      // Search files and collect matches
      const matches: FileMatch[] = [];

      for (const file of markdownFiles) {
        const match = await searchFile(file, regex, contextLines, app);

        if (match) {
          matches.push(match);

          // Stop once we have enough results
          if (matches.length >= maxResults) {
            break;
          }
        }
      }

      return formatResults(matches);
    },
  };
}
