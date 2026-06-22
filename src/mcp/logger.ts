import type { LogLevel } from "./types.js";

const LEVEL_RANK: Record<LogLevel, number> = {
  error: 0,
  warn: 1,
  info: 2,
  debug: 3,
};

/**
 * A tiny stderr-only logger.
 *
 * Logs MUST never go to stdout: the stdio transport uses stdout for the
 * JSON-RPC message stream, and any stray write would corrupt it.
 */
export function createLogger(level: LogLevel = "warn") {
  const threshold = LEVEL_RANK[level] ?? LEVEL_RANK.warn;

  function emit(at: LogLevel, args: unknown[]): void {
    if (LEVEL_RANK[at] > threshold) return;
    // eslint-disable-next-line no-console
    console.error(`[mcp:${at}]`, ...args);
  }

  return {
    error: (...args: unknown[]) => emit("error", args),
    warn: (...args: unknown[]) => emit("warn", args),
    info: (...args: unknown[]) => emit("info", args),
    debug: (...args: unknown[]) => emit("debug", args),
  };
}

export type Logger = ReturnType<typeof createLogger>;
