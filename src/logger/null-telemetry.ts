/**
 * @fileoverview NullTelemetry — runs spans without recording anything.
 */
import type { Telemetry } from './types.js';

/** Telemetry that runs spans and records nothing — the default. */
export class NullTelemetry implements Telemetry {
  withSpan<T>(_name: string, fn: () => T): T {
    return fn();
  }
}
