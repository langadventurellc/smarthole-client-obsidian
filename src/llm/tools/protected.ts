/**
 * Protected Path Utility
 *
 * Shared utility functions for protecting sensitive directories from file
 * operation tools. Prevents access to .obsidian/, .smarthole/, and .git/
 * directories which contain configuration, internal storage, and repository data.
 */

import { normalizePath } from "./pathUtils";

/**
 * Folders that are protected from agent file operations.
 * - .obsidian/: Obsidian configuration (could break the app)
 * - .smarthole/: Internal storage (inbox, trash, etc.)
 * - .git/: Git repository data (managed by GitService)
 */
const PROTECTED_FOLDERS = [".obsidian", ".smarthole", ".git"] as const;

/**
 * Checks if a path is within a protected directory (case-insensitive).
 * Protected directories are those listed in PROTECTED_FOLDERS, matched at the vault root.
 *
 * @param relativePath - Path relative to the vault root
 * @returns true if the path is protected, false otherwise
 *
 * @example
 * isProtectedPath('.obsidian/config') // true
 * isProtectedPath('.Obsidian/config') // true (case-insensitive)
 * isProtectedPath('.OBSIDIAN') // true (case-insensitive)
 * isProtectedPath('.obsidian') // true
 * isProtectedPath('.smarthole/inbox/msg.json') // true
 * isProtectedPath('.SmartHole/inbox') // true (case-insensitive)
 * isProtectedPath('notes/.obsidian/file.md') // false (not at root)
 * isProtectedPath('my.obsidian.notes/file.md') // false (not the folder)
 * isProtectedPath('folder/file.md') // false
 */
export function isProtectedPath(relativePath: string): boolean {
  const normalized = normalizePath(relativePath);
  const normalizedLower = normalized.toLowerCase();

  return PROTECTED_FOLDERS.some(
    (folder) => normalizedLower === folder || normalizedLower.startsWith(`${folder}/`)
  );
}

/**
 * Asserts that a path is not protected, throwing an error if it is.
 * Use this before performing any file operation to ensure the agent
 * cannot access protected directories.
 *
 * @param path - Path relative to the vault root
 * @throws Error if the path is protected
 *
 * @example
 * assertNotProtected('.obsidian/config')
 * // throws: "Access denied: Cannot access files in '.obsidian/' directory (protected system folder)"
 */
export function assertNotProtected(path: string): void {
  if (isProtectedPath(path)) {
    const normalized = normalizePath(path);
    const normalizedLower = normalized.toLowerCase();
    const folder = PROTECTED_FOLDERS.find(
      (f) => normalizedLower === f || normalizedLower.startsWith(`${f}/`)
    );
    throw new Error(
      `Access denied: Cannot access files in '${folder}/' directory (protected system folder)`
    );
  }
}
