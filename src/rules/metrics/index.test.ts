/**
 * @fileoverview Tests for the metrics pack aggregate.
 */
import { describe, expect, it } from 'vitest';
import { metricsRules } from './index.js';

describe('metricsRules', () => {
  it('aggregates the five metrics rules by id', () => {
    expect(metricsRules.map((r) => r.id).sort()).toEqual([
      'afferent-coupling',
      'cross-cutting-concern',
      'efferent-coupling',
      'instability',
      'unit-cohesion',
    ]);
  });

  it('every rule belongs to the metrics pack', () => {
    for (const rule of metricsRules) {
      expect(rule.pack).toBe('metrics');
    }
  });
});
