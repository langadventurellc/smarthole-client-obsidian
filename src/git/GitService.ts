/**
 * Git Service
 *
 * Core service wrapping isomorphic-git for local vault version control.
 * Handles repository initialization, staging, committing, log queries,
 * and diff generation. Uses Node.js fs (available in Obsidian's Electron runtime).
 */

import * as fs from "fs";
import * as path from "path";
import git, { TREE, walk } from "isomorphic-git";

import type { GitCommitInfo, GitCommitOptions, GitDiffEntry, GitSearchOptions } from "./types";

const SMARTHOLE_EMAIL = "smarthole@local";

const DEFAULT_GITIGNORE = `.obsidian/
.smarthole/
.trash/
.DS_Store
Thumbs.db
desktop.ini
`;

export class GitService {
  private basePath: string;

  constructor(vaultBasePath: string) {
    this.basePath = vaultBasePath;
  }

  /** Initialize a git repository if one does not already exist. */
  async initialize(): Promise<void> {
    if (this.isInitialized()) {
      return;
    }
    await git.init({ fs, dir: this.basePath });
  }

  /** Check whether a .git directory exists in the vault root. */
  isInitialized(): boolean {
    return fs.existsSync(path.join(this.basePath, ".git"));
  }

  /**
   * Create a default .gitignore if one does not already exist.
   * If a .gitignore is already present, it is left untouched.
   */
  seedGitignore(): void {
    const gitignorePath = path.join(this.basePath, ".gitignore");
    if (fs.existsSync(gitignorePath)) {
      return;
    }
    fs.writeFileSync(gitignorePath, DEFAULT_GITIGNORE, "utf-8");
  }

  // ===========================================================================
  // Change Detection
  // ===========================================================================

  /**
   * Check whether the working directory has any uncommitted changes.
   * Returns true when at least one file differs from the HEAD+index state.
   */
  async hasChanges(): Promise<boolean> {
    const matrix = await git.statusMatrix({ fs, dir: this.basePath });
    return matrix.some(([, head, workdir, stage]) => !(head === 1 && workdir === 1 && stage === 1));
  }

  /** Return file paths that have uncommitted changes (added, modified, or deleted). */
  async getChangedFiles(): Promise<string[]> {
    const matrix = await git.statusMatrix({ fs, dir: this.basePath });
    return matrix
      .filter(([, head, workdir, stage]) => !(head === 1 && workdir === 1 && stage === 1))
      .map(([filepath]) => filepath);
  }

  // ===========================================================================
  // Commit Operations
  // ===========================================================================

  /**
   * Stage all changed files and create a commit.
   * Returns the commit SHA on success, or null if there were no changes.
   */
  async commitAll(options: GitCommitOptions): Promise<string | null> {
    const matrix = await git.statusMatrix({ fs, dir: this.basePath });

    const changed = matrix.filter(
      ([, head, workdir, stage]) => !(head === 1 && workdir === 1 && stage === 1)
    );

    if (changed.length === 0) {
      return null;
    }

    // Stage each changed file
    for (const [filepath, , workdir] of changed) {
      if (workdir === 0) {
        // File deleted from working directory
        await git.remove({ fs, dir: this.basePath, filepath });
      } else {
        await git.add({ fs, dir: this.basePath, filepath });
      }
    }

    const message = this.formatCommitMessage(options);

    const sha = await git.commit({
      fs,
      dir: this.basePath,
      message,
      author: {
        name: options.authorName,
        email: SMARTHOLE_EMAIL,
      },
    });

    return sha;
  }

  /**
   * Format a structured commit message with metadata block.
   *
   * Format:
   * ```
   * type(scope): summary
   *
   * body
   *
   * ---
   * smarthole-metadata:
   *   conversation: <id>
   *   tools-used: [list]
   *   files-affected: [list]
   *   source: agent|mixed
   * ```
   */
  formatCommitMessage(options: GitCommitOptions): string {
    const { type, summary, body, metadata } = options;

    const headline = `${type}(vault): ${summary}`;

    const metadataBlock = [
      "---",
      "smarthole-metadata:",
      `  conversation: ${metadata.conversationId}`,
      `  tools-used: [${metadata.toolsUsed.join(", ")}]`,
      `  files-affected: [${metadata.filesAffected.join(", ")}]`,
      `  source: ${metadata.source}`,
    ].join("\n");

    const parts = [headline];
    if (body) {
      parts.push("", body);
    }
    parts.push("", metadataBlock);

    return parts.join("\n");
  }

  // ===========================================================================
  // Log / Query Operations
  // ===========================================================================

  /**
   * Retrieve commit log entries.
   *
   * @param options.maxCount - Maximum number of entries to return
   * @param options.filepath - Only include commits that affected this file
   */
  async log(options?: { maxCount?: number; filepath?: string }): Promise<GitCommitInfo[]> {
    const logResult = await git.log({
      fs,
      dir: this.basePath,
      depth: options?.maxCount,
      filepath: options?.filepath,
    });

    return logResult.map((entry) => this.toCommitInfo(entry.oid, entry.commit));
  }

  /**
   * Search commit history by message text, file path, and/or date range.
   * At least one of query or filepath should be provided.
   */
  async searchCommits(options: GitSearchOptions): Promise<GitCommitInfo[]> {
    const maxResults = options.maxResults ?? 10;

    // Fetch 10x the desired results to account for post-filtering by query/date.
    // This heuristic may over-fetch (wasted work) or under-fetch (missing matches
    // beyond the depth window), but is acceptable for MVP.
    const logResult = await git.log({
      fs,
      dir: this.basePath,
      depth: maxResults * 10,
      filepath: options.filepath,
    });

    let results = logResult.map((entry) => this.toCommitInfo(entry.oid, entry.commit));

    // Filter by query text (case-insensitive)
    if (options.query) {
      const lowerQuery = options.query.toLowerCase();
      results = results.filter((c) => c.message.toLowerCase().includes(lowerQuery));
    }

    // Filter by date range
    if (options.since) {
      results = results.filter((c) => c.date >= options.since!);
    }
    if (options.until) {
      results = results.filter((c) => c.date <= options.until!);
    }

    return results.slice(0, maxResults);
  }

  // ===========================================================================
  // Commit Detail / Diff Operations
  // ===========================================================================

  /**
   * Retrieve full details for a single commit, including file diffs.
   *
   * // TODO: readCommit is called here and again inside getFileDiffs for the
   * // same OID. Could be optimized by passing the ReadCommitResult through
   * // if performance becomes a concern.
   */
  async getCommitDetails(commitHash: string): Promise<GitCommitInfo> {
    const result = await git.readCommit({
      fs,
      dir: this.basePath,
      oid: commitHash,
    });

    const info = this.toCommitInfo(result.oid, result.commit);
    info.filesChanged = await this.getFileDiffs(commitHash);
    return info;
  }

  /** Compute the list of files changed in a commit by comparing its tree to its parent's tree. */
  async getFileDiffs(commitOid: string): Promise<GitDiffEntry[]> {
    const result = await git.readCommit({
      fs,
      dir: this.basePath,
      oid: commitOid,
    });

    const parentOid = result.commit.parent[0]; // first parent, or undefined for initial commit
    const diffs: GitDiffEntry[] = [];

    if (!parentOid) {
      // Initial commit: walk the commit tree only; everything is an "add"
      await walk({
        fs,
        dir: this.basePath,
        trees: [TREE({ ref: commitOid })],
        map: async (filepath, entries) => {
          if (filepath === ".") return undefined;
          const entry = entries[0];
          if (!entry) return undefined;
          const entryType = await entry.type();
          if (entryType === "blob") {
            diffs.push({ filepath, type: "add" });
          }
          return undefined;
        },
      });
    } else {
      // Compare parent tree to commit tree
      await walk({
        fs,
        dir: this.basePath,
        trees: [TREE({ ref: parentOid }), TREE({ ref: commitOid })],
        map: async (filepath, entries) => {
          if (filepath === ".") return undefined;

          const [parentEntry, commitEntry] = entries;
          const pOid = parentEntry ? await parentEntry.oid() : undefined;
          const cOid = commitEntry ? await commitEntry.oid() : undefined;

          // Unchanged
          if (pOid === cOid) return undefined;

          // Skip directories (trees) — we only care about blobs
          const pType = parentEntry ? await parentEntry.type() : undefined;
          const cType = commitEntry ? await commitEntry.type() : undefined;
          if (pType === "tree" || cType === "tree") return undefined;

          if (!parentEntry || pOid === undefined) {
            diffs.push({ filepath, type: "add" });
          } else if (!commitEntry || cOid === undefined) {
            diffs.push({ filepath, type: "delete" });
          } else {
            diffs.push({ filepath, type: "modify" });
          }

          return undefined;
        },
      });
    }

    return diffs;
  }

  // ===========================================================================
  // Private Helpers
  // ===========================================================================

  private toCommitInfo(
    oid: string,
    commit: {
      message: string;
      author: { name: string; email: string; timestamp: number };
      parent: string[];
    }
  ): GitCommitInfo {
    return {
      hash: oid,
      abbreviatedHash: oid.slice(0, 7),
      message: commit.message,
      date: new Date(commit.author.timestamp * 1000),
      author: {
        name: commit.author.name,
        email: commit.author.email,
      },
    };
  }
}
