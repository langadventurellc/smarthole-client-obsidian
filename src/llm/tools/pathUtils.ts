/**
 * Path Utilities
 *
 * Shared utility functions for path normalization and glob pattern matching.
 * Used by multiple vault tools for consistent path handling.
 */

import type { App, TFile, TFolder } from "obsidian";

/**
 * Normalizes a file path for consistent comparison.
 * - Converts backslashes to forward slashes
 * - Removes trailing slashes
 * - Removes leading slashes (paths should be relative to vault root)
 *
 * @param path - The path to normalize
 * @returns Normalized path string
 */
export function normalizePath(path: string): string {
  let normalized = path.replace(/\\/g, "/");
  normalized = normalized.replace(/\/+$/, "");
  normalized = normalized.replace(/^\/+/, "");
  return normalized;
}

/**
 * Converts a glob pattern to a RegExp for matching file paths.
 *
 * Supported patterns:
 * - "*.ext" - Files with extension in root
 * - "**\/*.ext" - Files with extension in any directory
 * - "folder/*" - Direct children of folder
 * - "folder/**" - All descendants of folder
 * - "**" - Match any path
 * - "?" - Match single character (except /)
 *
 * @param globPattern - The glob pattern to convert
 * @returns RegExp that matches the pattern
 */
export function globToRegex(globPattern: string): RegExp {
  // Normalize pattern: remove leading/trailing slashes, convert backslashes
  let pattern = globPattern.replace(/\\/g, "/").replace(/^\/+|\/+$/g, "");

  // Escape regex special characters except * and ?
  pattern = pattern.replace(/[.+^${}()|[\]]/g, "\\$&");

  // Handle ** (match any path segment including slashes)
  // Replace **/ with a placeholder first to handle it separately
  pattern = pattern.replace(/\*\*\//g, "{{GLOBSTAR_SLASH}}");
  // Replace remaining ** (at end or standalone)
  pattern = pattern.replace(/\*\*/g, "{{GLOBSTAR}}");

  // Handle * (match anything except /)
  pattern = pattern.replace(/\*/g, "[^/]*");

  // Handle ? (match single character except /)
  pattern = pattern.replace(/\?/g, "[^/]");

  // Replace placeholders with actual regex
  // **/ matches zero or more path segments
  pattern = pattern.replace(/\{\{GLOBSTAR_SLASH\}\}/g, "(?:.*?/)?");
  // ** at end matches anything including nested paths
  pattern = pattern.replace(/\{\{GLOBSTAR\}\}/g, ".*");

  // Anchor the pattern to match the full path (case-insensitive for better usability)
  return new RegExp(`^${pattern}$`, "i");
}

/**
 * Tests if a file path matches a glob pattern.
 *
 * @param filePath - The file path to test (relative to vault root)
 * @param globPattern - The glob pattern to match against
 * @returns true if the path matches the pattern
 */
export function matchGlob(filePath: string, globPattern: string): boolean {
  // Normalize the file path
  const normalizedPath = filePath.replace(/\\/g, "/").replace(/^\/+/, "");

  try {
    const regex = globToRegex(globPattern);
    return regex.test(normalizedPath);
  } catch {
    // Invalid glob pattern - return false rather than throwing
    return false;
  }
}

/**
 * Result of a case-insensitive file/folder lookup.
 */
export interface InsensitiveLookupResult<T> {
  /** The matched file/folder, or null if not found or ambiguous */
  item: T | null;
  /** True if multiple case-insensitive matches exist (ambiguous) */
  ambiguous: boolean;
}

/**
 * Finds a file by path, case-insensitively.
 * Prefers exact match (fast path), falls back to case-insensitive enumeration.
 *
 * @param app - The Obsidian App instance for vault access
 * @param path - The file path to look up (relative to vault root)
 * @returns Lookup result with the matched file and ambiguity indicator
 *
 * @example
 * // Exact match exists
 * findFileInsensitive(app, 'Projects/note.md') // { item: TFile, ambiguous: false }
 *
 * // Case-insensitive match
 * findFileInsensitive(app, 'projects/note.md') // { item: TFile for 'Projects/note.md', ambiguous: false }
 *
 * // Multiple matches (e.g., 'Projects/note.md' and 'PROJECTS/note.md' both exist)
 * findFileInsensitive(app, 'projects/note.md') // { item: null, ambiguous: true }
 *
 * // No match
 * findFileInsensitive(app, 'nonexistent.md') // { item: null, ambiguous: false }
 */
export function findFileInsensitive(app: App, path: string): InsensitiveLookupResult<TFile> {
  // Handle empty path
  if (!path || path.trim().length === 0) {
    return { item: null, ambiguous: false };
  }

  const normalizedPath = normalizePath(path);

  // Fast path: try exact match first
  const exactMatch = app.vault.getFileByPath(normalizedPath);
  if (exactMatch) {
    return { item: exactMatch, ambiguous: false };
  }

  // Slow path: enumerate all files and find case-insensitive matches
  const normalizedLower = normalizedPath.toLowerCase();
  const matches: TFile[] = [];

  for (const file of app.vault.getFiles()) {
    if (file.path.toLowerCase() === normalizedLower) {
      matches.push(file);
    }
  }

  // No matches found
  if (matches.length === 0) {
    return { item: null, ambiguous: false };
  }

  // Exactly one case-insensitive match
  if (matches.length === 1) {
    return { item: matches[0], ambiguous: false };
  }

  // Multiple matches - ambiguous
  return { item: null, ambiguous: true };
}

/**
 * Finds a folder by path, case-insensitively.
 * Prefers exact match (fast path), falls back to case-insensitive enumeration.
 *
 * @param app - The Obsidian App instance for vault access
 * @param path - The folder path to look up (relative to vault root)
 * @returns Lookup result with the matched folder and ambiguity indicator
 *
 * @example
 * // Exact match exists
 * findFolderInsensitive(app, 'Projects') // { item: TFolder, ambiguous: false }
 *
 * // Case-insensitive match
 * findFolderInsensitive(app, 'projects') // { item: TFolder for 'Projects', ambiguous: false }
 *
 * // Multiple matches (e.g., 'Projects' and 'PROJECTS' both exist)
 * findFolderInsensitive(app, 'projects') // { item: null, ambiguous: true }
 *
 * // No match
 * findFolderInsensitive(app, 'nonexistent') // { item: null, ambiguous: false }
 */
export function findFolderInsensitive(app: App, path: string): InsensitiveLookupResult<TFolder> {
  // Handle empty path
  if (!path || path.trim().length === 0) {
    return { item: null, ambiguous: false };
  }

  const normalizedPath = normalizePath(path);

  // Fast path: try exact match first
  const exactMatch = app.vault.getFolderByPath(normalizedPath);
  if (exactMatch) {
    return { item: exactMatch, ambiguous: false };
  }

  // Slow path: enumerate all loaded files and find case-insensitive folder matches
  const normalizedLower = normalizedPath.toLowerCase();
  const matches: TFolder[] = [];

  for (const item of app.vault.getAllLoadedFiles()) {
    // TFolder does not have an 'extension' property, TFile does
    // Check if it's a folder by verifying it's not a file
    const isFolder = !("extension" in item);

    if (isFolder && item.path.toLowerCase() === normalizedLower) {
      matches.push(item as TFolder);
    }
  }

  // No matches found
  if (matches.length === 0) {
    return { item: null, ambiguous: false };
  }

  // Exactly one case-insensitive match
  if (matches.length === 1) {
    return { item: matches[0], ambiguous: false };
  }

  // Multiple matches - ambiguous
  return { item: null, ambiguous: true };
}
