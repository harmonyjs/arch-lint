/**
 * @fileoverview RecordingTelemetry — captures each span's wall-clock duration.
 */
import { performance } from 'node:perf_hooks';
import type { Telemetry } from './types.js';

/** Telemetry that records the accumulated wall-clock duration of each span. */
export class RecordingTelemetry implements Telemetry {
  readonly timings: Map<string, number> = new Map<string, number>();

  withSpan<T>(name: string, fn: () => T): T {
    const start = performance.now();
    try {
      return fn();
    } finally {
      this.recordTiming(name, performance.now() - start);
    }
  }

  /**
   * Records `ms` against `name`. Repeated calls with the same `name` accumulate:
   * the new duration is added to the prior total, never replacing it.
   */
  recordTiming(name: string, ms: number): void {
    this.timings.set(name, (this.timings.get(name) ?? 0) + ms);
  }
}
