/**
 * view_commit Tool
 *
 * Shows full details of a specific commit including message, author,
 * date, and per-file diffs.
 */

import type { GitService } from "../../../git";
import type { GitDiffEntry } from "../../../git";
import type { ToolHandler } from "../../LLMService";
import type { Tool } from "../../types";

/** Maximum characters of diff content per file before truncation */
const MAX_DIFF_CHARS_PER_FILE = 5000;

const toolDefinition: Tool = {
  name: "view_commit",
  description:
    "View full details of a specific commit by its hash. Returns the commit message, author, date, and list of files changed with their change types.",
  inputSchema: {
    type: "object",
    properties: {
      commit_hash: {
        type: "string",
        description: "The commit hash (full or abbreviated) to view details for.",
      },
    },
    required: ["commit_hash"],
  },
};

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
 * Creates a ToolHandler for the view_commit tool.
 *
 * @param gitService - The GitService instance for repository access
 * @returns A ToolHandler that can be registered with LLMService
 */
export function createViewCommitTool(gitService: GitService): ToolHandler {
  return {
    definition: toolDefinition,
    execute: async (input: Record<string, unknown>): Promise<string> => {
      const commitHash = input.commit_hash as string | undefined;

      // Validate commit_hash
      if (!commitHash || typeof commitHash !== "string" || commitHash.trim().length === 0) {
        return "Error: commit_hash is required and must be a non-empty string.";
      }

      const hash = commitHash.trim();

      try {
        const commit = await gitService.getCommitDetails(hash);

        const lines: string[] = [];
        lines.push(`## Commit ${commit.hash}`);
        lines.push(`Author: ${commit.author.name} <${commit.author.email}>`);
        lines.push(`Date: ${commit.date.toISOString()}`);
        lines.push("");
        lines.push(commit.message.trim());

        if (commit.filesChanged && commit.filesChanged.length > 0) {
          lines.push("");
          lines.push(`### Files Changed (${commit.filesChanged.length})`);
          for (const diff of commit.filesChanged) {
            lines.push(formatDiffEntry(diff));
          }
        }

        return lines.join("\n");
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unknown error";
        return `Error viewing commit: ${message}`;
      }
    },
  };
}
