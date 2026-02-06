/**
 * Git Version Control Types
 *
 * Type definitions for the GitService layer wrapping isomorphic-git.
 * These types define commit metadata, options, and query structures
 * used throughout the git integration feature.
 */

// =============================================================================
// Commit Types
// =============================================================================

/** Commit metadata appended automatically to commit messages (not LLM-generated). */
export interface GitCommitMetadata {
  conversationId: string;
  toolsUsed: string[];
  filesAffected: string[];
  source: "agent" | "mixed";
}

/** Options for creating a commit. */
export interface GitCommitOptions {
  /** Type of change: vault (file changes), organize (moves/renames), cleanup (deletions) */
  type: "vault" | "organize" | "cleanup";
  /** LLM-generated summary line */
  summary: string;
  /** LLM-generated body description */
  body: string;
  /** Structured metadata appended to the commit message */
  metadata: GitCommitMetadata;
  /** Author name from settings (e.g., "SmartHole Agent") */
  authorName: string;
}

// =============================================================================
// Query Result Types
// =============================================================================

/** Info about a single commit (returned from log/search). */
export interface GitCommitInfo {
  /** Full commit OID */
  hash: string;
  /** First 7 characters of the OID */
  abbreviatedHash: string;
  /** Full commit message */
  message: string;
  /** Commit date */
  date: Date;
  /** Commit author */
  author: { name: string; email: string };
  /** Files changed in this commit (populated when requested) */
  filesChanged?: GitDiffEntry[];
}

/** Diff information for a single file in a commit. */
export interface GitDiffEntry {
  /** Path to the file relative to vault root */
  filepath: string;
  /** Type of change */
  type: "add" | "modify" | "delete";
  /** Diff content when requested */
  content?: string;
}

// =============================================================================
// Search Types
// =============================================================================

/** Search options for commit history. */
export interface GitSearchOptions {
  /** Text to search in commit messages */
  query?: string;
  /** Filter to commits affecting a specific file */
  filepath?: string;
  /** Only commits after this date */
  since?: Date;
  /** Only commits before this date */
  until?: Date;
  /** Maximum number of results to return */
  maxResults?: number;
}
