/**
 * @fileoverview Tests for long consumer-list folding.
 */
import { describe, expect, it } from 'vitest';
import { foldConsumers } from './format.js';

describe('foldConsumers', () => {
  it('keeps lists of 5 or fewer entries intact', () => {
    const five = ['a', 'b', 'c', 'd', 'e'];
    expect(foldConsumers(five, true)).toEqual(five);
  });

  it('folds lists longer than 5 to first 5 plus a summary line', () => {
    const eight = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
    expect(foldConsumers(eight, true)).toEqual(['a', 'b', 'c', 'd', 'e', '… and 3 more']);
  });

  it('does not fold when folding is disabled', () => {
    const eight = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
    expect(foldConsumers(eight, false)).toEqual(eight);
  });
});
