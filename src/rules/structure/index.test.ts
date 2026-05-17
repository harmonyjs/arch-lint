/**
 * @fileoverview Tests for the structure pack aggregate.
 */
import { describe, expect, it } from 'vitest';
import { structureRules } from './index.js';

describe('structureRules', () => {
  it('aggregates the two structure rules by id', () => {
    expect(structureRules.map((r) => r.id).sort()).toEqual([
      'orphan-test',
      'prefix-cluster-folder',
    ]);
  });

  it('every rule belongs to the structure pack', () => {
    for (const rule of structureRules) {
      expect(rule.pack).toBe('structure');
    }
  });
});
