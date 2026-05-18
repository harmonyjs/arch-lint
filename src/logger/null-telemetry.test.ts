/**
 * @fileoverview Tests for NullTelemetry.
 */
import { describe, expect, it } from 'vitest';
import { NullTelemetry } from './null-telemetry.js';

describe('NullTelemetry', () => {
  it('runs the span and returns its result', () => {
    expect(new NullTelemetry().withSpan('x', () => 42)).toBe(42);
  });
});
