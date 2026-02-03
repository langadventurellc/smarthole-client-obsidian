/**
 * searchNotes Tool
 *
 * Searches for notes in the vault using plain text search.
 * Returns matching file paths with relevant excerpts showing match context.
 */

import { prepareSimpleSearch, type App, type SearchResult } from "obsidian";
import type { ToolHandler } from "../LLMService";
import type { Tool } from "../types";

/** Maximum number of search results to return */
const MAX_RESULTS = 10;

/** Number of characters to show before/after a match for context */
const CONTEXT_CHARS = 100;

/**
 * Represents a search match result with file information and excerpts.
 */
interface SearchMatch {
  path: string;
  score: number;
  excerpts: string[];
  content?: string;
}

/**
 * Extracts excerpts from content around match positions.
 * Shows context around each match to help understand relevance.
 */
function extractExcerpts(content: string, searchResult: SearchResult): string[] {
  const excerpts: string[] = [];
  const matches = searchResult.matches;

  // Process each match, but limit to first few to avoid overwhelming output
  const maxExcerpts = 3;
  const processedRanges: [number, number][] = [];

  for (let i = 0; i < Math.min(matches.length, maxExcerpts); i++) {
    const [start, end] = matches[i];

    // Check if this match overlaps with an already processed range
    const overlaps = processedRanges.some(([prevStart, prevEnd]) => {
      const excerptStart = Math.max(0, start - CONTEXT_CHARS);
      const excerptEnd = Math.min(content.length, end + CONTEXT_CHARS);
      return excerptStart < prevEnd && excerptEnd > prevStart;
    });

    if (overlaps) {
      continue;
    }

    // Calculate excerpt boundaries
    const excerptStart = Math.max(0, start - CONTEXT_CHARS);
    const excerptEnd = Math.min(content.length, end + CONTEXT_CHARS);

    // Build excerpt with ellipsis indicators
    let excerpt = "";
    if (excerptStart > 0) {
      excerpt += "...";
    }
    excerpt += content.slice(excerptStart, excerptEnd).trim();
    if (excerptEnd < content.length) {
      excerpt += "...";
    }

    // Clean up whitespace (replace multiple newlines/spaces with single space)
    excerpt = excerpt.replace(/\s+/g, " ");

    if (excerpt.length > 0) {
      excerpts.push(excerpt);
      processedRanges.push([excerptStart, excerptEnd]);
    }
  }

  return excerpts;
}

/**
 * Formats search results for LLM consumption.
 */
function formatResults(matches: SearchMatch[], readContent: boolean): string {
  if (matches.length === 0) {
    return "No notes found matching your search query.";
  }

  const lines: string[] = [`Found ${matches.length} matching note(s):\n`];

  for (const match of matches) {
    lines.push(`## ${match.path}`);

    if (readContent && match.content) {
      // Return full content when read_content is true
      lines.push(match.content);
    } else {
      // Return excerpts showing match context
      if (match.excerpts.length > 0) {
        lines.push("Excerpts:");
        for (const excerpt of match.excerpts) {
          lines.push(`  "${excerpt}"`);
        }
      }
    }

    lines.push(""); // Empty line between results
  }

  return lines.join("\n").trim();
}

const toolDefinition: Tool = {
  name: "search_notes",
  description:
    "Search for notes in the vault using plain text search. Returns matching file paths with relevant excerpts showing match context. Use read_content=true to get the full content of matching notes.",
  inputSchema: {
    type: "object",
    properties: {
      query: {
        type: "string",
        description:
          "The search query. Searches for space-separated words in note content. All words must match.",
      },
      read_content: {
        type: "boolean",
        description:
          "If true, returns the full content of matching notes instead of just excerpts. Default is false.",
      },
    },
    required: ["query"],
  },
};

/**
 * Creates a ToolHandler for the search_notes tool.
 *
 * @param app - The Obsidian App instance for vault access
 * @returns A ToolHandler that can be registered with LLMService
 */
export function createSearchNotesTool(app: App): ToolHandler {
  return {
    definition: toolDefinition,
    execute: async (input: Record<string, unknown>): Promise<string> => {
      const query = input.query as string;
      const readContent = (input.read_content as boolean) ?? false;

      // Validate query input
      if (!query || typeof query !== "string" || query.trim().length === 0) {
        return "Error: query is required and must be a non-empty string.";
      }

      const trimmedQuery = query.trim();

      // Prepare the search function
      const search = prepareSimpleSearch(trimmedQuery);

      // Search all markdown files
      const markdownFiles = app.vault.getMarkdownFiles();
      const matches: SearchMatch[] = [];

      for (const file of markdownFiles) {
        const content = await app.vault.cachedRead(file);
        const result = search(content);

        if (result) {
          const match: SearchMatch = {
            path: file.path,
            score: result.score,
            excerpts: extractExcerpts(content, result),
          };

          // Include full content if requested
          if (readContent) {
            // Truncate extremely long content to prevent context overflow
            const maxContentLength = 10000;
            if (content.length > maxContentLength) {
              match.content = content.slice(0, maxContentLength) + "\n\n[Content truncated...]";
            } else {
              match.content = content;
            }
          }

          matches.push(match);
        }
      }

      // Sort by score (higher is better) and limit results
      matches.sort((a, b) => b.score - a.score);
      const limitedMatches = matches.slice(0, MAX_RESULTS);

      return formatResults(limitedMatches, readContent);
    },
  };
}
