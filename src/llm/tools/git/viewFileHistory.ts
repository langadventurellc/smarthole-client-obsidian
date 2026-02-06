/**
 * view_file_history Tool
 *
 * Shows commit history for a specific file, with optional diff content.
 * Returns chronological commits that affected the given file path.
 */

import type { GitService } from "../../../git";
import type { GitDiffEntry } from "../../../git";
import type { ToolHandler } from "../../LLMService";
import type { Tool } from "../../types";

/** Maximum characters of diff content per file before truncation */
const MAX_DIFF_CHARS_PER_FILE = 5000;

const toolDefinition: Tool = {
  name: "view_file_history",
  description:
    "Show commit history for a specific file. Returns commits that affected the file, with optional diff details showing what changed in each commit.",
  inputSchema: {
    type: "object",
    properties: {
      file_path: {
        type: "string",
        description: "Path to the file to view history for (e.g., 'notes/meeting.md').",
      },
      max_results: {
        type: "integer",
        description: "Maximum number of commits to return. Default is 5.",
      },
      include_diff: {
        type: "boolean",
        description:
          "Whether to include diff details showing what changed in each commit. Default is false.",
      },
    },
    required: ["file_path"],
  },
};

function formatDate(date: Date): string {
  return date.toISOString().split("T")[0];
}

function formatDiffEntry(entry: GitDiffEntry): string {
  let line = `  ${entry.type.toUpperCase()} ${entry.filepath}`;
  if (entry.content) {
    const content =
      entry.content.length > MAX_DIFF_CHARS_PER_FILE
        ? entry.content.slice(0, MAX_DIFF_CHARS_PER_FILE) + "\n[... diff truncated]"
        : entry.content;
    line += `\n\`\`\`\n${content}\n\`\`\``;
  }
  return line;
}

/**
 * Creates a ToolHandler for the view_file_history tool.
 *
 * @param gitService - The GitService instance for repository access
 * @returns A ToolHandler that can be registered with LLMService
 */
export function createViewFileHistoryTool(gitService: GitService): ToolHandler {
  return {
    definition: toolDefinition,
    execute: async (input: Record<string, unknown>): Promise<string> => {
      const filePath = input.file_path as string | undefined;
      const maxResults = input.max_results as number | undefined;
      const includeDiff = input.include_diff as boolean | undefined;

      // Validate file_path
      if (!filePath || typeof filePath !== "string" || filePath.trim().length === 0) {
        return "Error: file_path is required and must be a non-empty string.";
      }

      const path = filePath.trim();
      const limit = maxResults && maxResults > 0 ? maxResults : 5;

      try {
        const commits = await gitService.log({ maxCount: limit, filepath: path });

        if (commits.length === 0) {
          return `No commits found for file: "${path}"`;
        }

        const lines: string[] = [`History for "${path}" (${commits.length} commit(s)):\n`];

        for (const commit of commits) {
          const date = formatDate(commit.date);
          const firstLine = commit.message.split("\n")[0];
          lines.push(`## [${commit.abbreviatedHash}] ${date}`);
          lines.push(firstLine);

          if (includeDiff) {
            const diffs = await gitService.getFileDiffs(commit.hash);
            // Filter diffs to only show the requested file
            const fileDiffs = diffs.filter((d) => d.filepath === path);

            if (fileDiffs.length > 0) {
              for (const diff of fileDiffs) {
                lines.push(formatDiffEntry(diff));
              }
            }
          }

          lines.push("");
        }

        return lines.join("\n").trim();
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unknown error";
        return `Error viewing file history: ${message}`;
      }
    },
  };
}
