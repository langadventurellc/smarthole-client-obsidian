/**
 * Path Utilities
 *
 * Shared utility functions for path normalization and glob pattern matching.
 * Used by multiple vault tools for consistent path handling.
 */

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

  // Anchor the pattern to match the full path
  return new RegExp(`^${pattern}$`);
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
