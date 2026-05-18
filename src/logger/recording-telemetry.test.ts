/**
 * @fileoverview Tests for RecordingTelemetry.
 */
import { describe, expect, it } from 'vitest';
import { RecordingTelemetry } from './recording-telemetry.js';

describe('RecordingTelemetry', () => {
  it('runs the span, returns its result, and records a timing', () => {
    const t = new RecordingTelemetry();
    expect(t.withSpan('rule-a', () => 'ok')).toBe('ok');
    expect(t.timings.has('rule-a')).toBe(true);
    expect(t.timings.get('rule-a')).toBeGreaterThanOrEqual(0);
  });

  it('accumulates repeated spans of the same name', () => {
    const t = new RecordingTelemetry();
    t.withSpan('rule-a', () => undefined);
    t.withSpan('rule-a', () => undefined);
    expect(t.timings.size).toBe(1);
  });
});
