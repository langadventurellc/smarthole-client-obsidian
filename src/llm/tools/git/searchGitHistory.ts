/**
 * search_git_history Tool
 *
 * Searches commit history by message content, file path, date range, or combination.
 * Returns matching commits with hash, date, message, and files changed summary.
 */

import type { GitService } from "../../../git";
import type { ToolHandler } from "../../LLMService";
import type { Tool } from "../../types";

const toolDefinition: Tool = {
  name: "search_git_history",
  description:
    "Search commit history by message content, file path, date range, or combination. Returns matching commits with hash, date, message, and files changed summary.",
  inputSchema: {
    type: "object",
    properties: {
      query: {
        type: "string",
        description: "Text to search for in commit messages.",
      },
      file_path: {
        type: "string",
        description: "Filter to commits that affected this file path.",
      },
      max_results: {
        type: "integer",
        description: "Maximum number of commits to return. Default is 10.",
      },
      since: {
        type: "string",
        description: "ISO date string. Only return commits after this date.",
      },
      until: {
        type: "string",
        description: "ISO date string. Only return commits before this date.",
      },
    },
    required: [],
  },
};

function formatDate(date: Date): string {
  return date.toISOString().split("T")[0];
}

/**
 * Creates a ToolHandler for the search_git_history tool.
 *
 * @param gitService - The GitService instance for repository access
 * @returns A ToolHandler that can be registered with LLMService
 */
export function createSearchGitHistoryTool(gitService: GitService): ToolHandler {
  return {
    definition: toolDefinition,
    execute: async (input: Record<string, unknown>): Promise<string> => {
      const query = input.query as string | undefined;
      const filePath = input.file_path as string | undefined;
      const maxResults = input.max_results as number | undefined;
      const sinceInput = input.since as string | undefined;
      const untilInput = input.until as string | undefined;

      // Validate: at least one of query or file_path required
      const hasQuery = query && typeof query === "string" && query.trim().length > 0;
      const hasFilePath = filePath && typeof filePath === "string" && filePath.trim().length > 0;

      if (!hasQuery && !hasFilePath) {
        return "Error: At least one of 'query' or 'file_path' must be provided.";
      }

      // Parse date parameters
      let since: Date | undefined;
      let until: Date | undefined;

      if (sinceInput && typeof sinceInput === "string") {
        since = new Date(sinceInput);
        if (isNaN(since.getTime())) {
          return `Error: Invalid 'since' date: "${sinceInput}". Please use an ISO date string (e.g., "2026-01-15").`;
        }
      }

      if (untilInput && typeof untilInput === "string") {
        until = new Date(untilInput);
        if (isNaN(until.getTime())) {
          return `Error: Invalid 'until' date: "${untilInput}". Please use an ISO date string (e.g., "2026-01-15").`;
        }
      }

      try {
        const commits = await gitService.searchCommits({
          query: hasQuery ? query!.trim() : undefined,
          filepath: hasFilePath ? filePath!.trim() : undefined,
          since,
          until,
          maxResults: maxResults && maxResults > 0 ? maxResults : 10,
        });

        if (commits.length === 0) {
          return "No commits found matching the search criteria.";
        }

        const lines: string[] = [`Found ${commits.length} matching commit(s):\n`];

        for (const commit of commits) {
          const date = formatDate(commit.date);
          const firstLine = commit.message.split("\n")[0];
          lines.push(`[${commit.abbreviatedHash}] ${date} -- ${firstLine}`);
        }

        return lines.join("\n");
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unknown error";
        return `Error searching git history: ${message}`;
      }
    },
  };
}
