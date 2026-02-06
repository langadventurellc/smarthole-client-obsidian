/**
 * Git Tools Module
 *
 * Exports tool factory functions for git history operations.
 * Each tool can be registered with LLMService using registerTool().
 * Tools are conditionally registered only when git version control is enabled.
 */

import type { GitService } from "../../../git";
import type { ToolHandler } from "../../LLMService";
import { createSearchGitHistoryTool } from "./searchGitHistory";
import { createViewFileHistoryTool } from "./viewFileHistory";
import { createViewCommitTool } from "./viewCommit";

/**
 * Creates all git history tools for registration with LLMService.
 *
 * @param gitService - The GitService instance for repository access
 * @returns Array of ToolHandlers for all git history operations
 */
export function createGitTools(gitService: GitService): ToolHandler[] {
  return [
    createSearchGitHistoryTool(gitService),
    createViewFileHistoryTool(gitService),
    createViewCommitTool(gitService),
  ];
}

// Re-export individual factory functions for selective use
export { createSearchGitHistoryTool } from "./searchGitHistory";
export { createViewFileHistoryTool } from "./viewFileHistory";
export { createViewCommitTool } from "./viewCommit";
