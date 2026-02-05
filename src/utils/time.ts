/**
 * Timestamp formatting utilities for converting UTC timestamps to local time.
 * Used on the LLM context path so the agent sees human-readable local times.
 * Storage remains UTC ISO 8601 throughout.
 */

/** Converts a UTC ISO 8601 string to local time like "Feb 5, 2026 10:30 AM". */
export function formatLocalTimestamp(isoString: string): string {
  if (!isoString) return isoString;

  const date = new Date(isoString);
  if (isNaN(date.getTime())) return isoString;

  return date.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

/** Converts epoch milliseconds to a local date like "Feb 5, 2026". */
export function formatLocalDate(mtime: number): string {
  const date = new Date(mtime);
  if (isNaN(date.getTime())) return String(mtime);

  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}
