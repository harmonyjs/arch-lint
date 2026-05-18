/**
 * @fileoverview Logger and Telemetry contracts — the output and span-recording
 * abstractions arch-lint threads through its operations.
 */

/** A sink for arch-lint's diagnostic output. */
export interface Logger {
  info(message: string): void;
  warn(message: string): void;
  error(message: string): void;
  debug(message: string): void;
}

/** A span recorder — wraps a unit of work so its timing can be captured. */
export interface Telemetry {
  /** Runs `fn` as a named span and returns its result. */
  withSpan<T>(name: string, fn: () => T): T;
  /** Records a raw timing sample for `name`, in milliseconds. */
  recordTiming?(name: string, ms: number): void;
}
