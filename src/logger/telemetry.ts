/**
 * @fileoverview Telemetry implementations — NullTelemetry runs spans without
 * recording; RecordingTelemetry captures each span's wall-clock duration.
 */
import { performance } from 'node:perf_hooks';
import type { Telemetry } from './types.js';

/** Telemetry that runs spans and records nothing — the default. */
export class NullTelemetry implements Telemetry {
  withSpan<T>(_name: string, fn: () => T): T {
    return fn();
  }
}

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

  recordTiming(name: string, ms: number): void {
    this.timings.set(name, (this.timings.get(name) ?? 0) + ms);
  }
}
