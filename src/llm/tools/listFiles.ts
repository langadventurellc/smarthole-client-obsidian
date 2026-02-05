/**
 * listFiles Tool
 *
 * Lists files and folders matching a glob pattern.
 * Returns paths sorted by modification time (most recent first).
 */

import type { App, TFile } from "obsidian";
import type { ToolHandler } from "../LLMService";
import type { Tool } from "../types";
import { findFolderInsensitive, matchGlob, normalizePath } from "./pathUtils";
import { isProtectedPath } from "./protected";
import { formatLocalDate } from "../../utils/time";

/** Default pattern when none specified */
const DEFAULT_PATTERN = "*";

/** Default maximum number of items to return */
const DEFAULT_MAX_RESULTS = 100;

/** Maximum allowed value for max_results to prevent performance issues */
const MAX_RESULTS_CAP = 1000;

interface ListItem {
  path: string;
  type: "file" | "folder";
  mtime: number;
}

/**
 * Adjusts a glob pattern to work relative to a base path.
 */
function adjustPatternForPath(pattern: string, basePath: string): string {
  const normalizedBase = normalizePath(basePath);
  const normalizedPattern = normalizePath(pattern);

  if (normalizedBase.length === 0) {
    return normalizedPattern;
  }

  // If pattern is just * or **, prefix with base path
  if (normalizedPattern === "*") {
    return `${normalizedBase}/*`;
  }
  if (normalizedPattern === "**") {
    return `${normalizedBase}/**`;
  }

  // Otherwise combine base path with pattern
  return `${normalizedBase}/${normalizedPattern}`;
}

/**
 * Formats the list of items for output.
 */
function formatResults(items: ListItem[], pattern: string, basePath: string): string {
  if (items.length === 0) {
    const pathDescription = basePath ? `"${basePath}"` : "vault root";
    return `No files or folders match the pattern "${pattern}" in ${pathDescription}.`;
  }

  const lines: string[] = [`Found ${items.length} item(s):\n`];

  for (const item of items) {
    if (item.type === "folder") {
      lines.push(`[folder] ${item.path}/`);
    } else {
      lines.push(`[file] ${item.path} (modified: ${formatLocalDate(item.mtime)})`);
    }
  }

  return lines.join("\n");
}

const toolDefinition: Tool = {
  name: "list_files",
  description:
    "List files and folders matching a glob pattern. Returns paths sorted by modification time (most recent first).",
  inputSchema: {
    type: "object",
    properties: {
      pattern: {
        type: "string",
        description:
          "Glob pattern to match (e.g., '*.md', '**/*.md', 'Projects/**'). Default: '*' for current directory.",
      },
      path: {
        type: "string",
        description: "Base path to search from. Default: vault root.",
      },
      max_results: {
        type: "integer",
        description: `Maximum number of items to return (1-${MAX_RESULTS_CAP}). Default: ${DEFAULT_MAX_RESULTS}.`,
      },
    },
    required: [],
  },
};

/**
 * Creates a ToolHandler for the list_files tool.
 *
 * @param app - The Obsidian App instance for vault access
 * @returns A ToolHandler that can be registered with LLMService
 */
export function createListFilesTool(app: App): ToolHandler {
  return {
    definition: toolDefinition,
    execute: async (input: Record<string, unknown>): Promise<string> => {
      const patternInput = input.pattern as string | undefined;
      const pathInput = input.path as string | undefined;
      const maxResultsInput = input.max_results as number | undefined;

      // Parse parameters with defaults
      const pattern = patternInput?.trim() || DEFAULT_PATTERN;
      const basePath = pathInput ? normalizePath(pathInput) : "";

      // Validate and cap max_results
      let maxResults = DEFAULT_MAX_RESULTS;
      if (maxResultsInput !== undefined) {
        if (typeof maxResultsInput !== "number" || !Number.isInteger(maxResultsInput)) {
          return "Error: max_results must be an integer.";
        }
        if (maxResultsInput < 1) {
          return "Error: max_results must be at least 1.";
        }
        maxResults = Math.min(maxResultsInput, MAX_RESULTS_CAP);
      }

      // Validate base path exists if provided (case-insensitive lookup)
      if (basePath.length > 0) {
        const result = findFolderInsensitive(app, basePath);
        if (result.ambiguous) {
          return `Error: Multiple folders match "${basePath}" with different casing. Please specify the exact path.`;
        }
        if (!result.item) {
          return `Error: Path "${basePath}" does not exist or is not a folder.`;
        }
      }

      // Construct the effective pattern to match against
      const effectivePattern = adjustPatternForPath(pattern, basePath);

      // Get all files and folders in the vault
      const allItems = app.vault.getAllLoadedFiles();

      // Collect matching items with their metadata
      const matchedItems: ListItem[] = [];

      for (const item of allItems) {
        // Skip protected paths
        if (isProtectedPath(item.path)) {
          continue;
        }

        // Skip the root (empty path)
        if (item.path === "" || item.path === "/") {
          continue;
        }

        // Check if the item matches the pattern
        if (!matchGlob(item.path, effectivePattern)) {
          continue;
        }

        // Determine type: TFile has an extension property, TFolder does not
        const isFolder = !(item as TFile).extension;

        let mtime = 0;
        if (!isFolder) {
          // TFile has stat property
          const file = item as TFile;
          mtime = file.stat.mtime;
        } else {
          // Folders don't have reliable mtime, try to get from adapter
          try {
            const stat = await app.vault.adapter.stat(item.path);
            mtime = stat?.mtime ?? 0;
          } catch {
            mtime = 0;
          }
        }

        matchedItems.push({
          path: item.path,
          type: isFolder ? "folder" : "file",
          mtime,
        });
      }

      // Sort by modification time (most recent first)
      // Folders with mtime 0 will be sorted to the end
      matchedItems.sort((a, b) => {
        // If both have same mtime (or both are 0), sort alphabetically
        if (a.mtime === b.mtime) {
          return a.path.localeCompare(b.path);
        }
        // Otherwise, most recent first
        return b.mtime - a.mtime;
      });

      // Limit results
      const limitedItems = matchedItems.slice(0, maxResults);

      return formatResults(limitedItems, pattern, basePath);
    },
  };
}
