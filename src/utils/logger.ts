/** Lightweight debug logger toggled via settings. */

let verbose = false;

export function setVerboseLogging(enabled: boolean): void {
  verbose = enabled;
}

export function debug(prefix: string, message: string, ...data: unknown[]): void {
  if (!verbose) return;
  if (data.length > 0) {
    console.debug(`[${prefix}] ${message}`, ...data);
  } else {
    console.debug(`[${prefix}] ${message}`);
  }
}
