/**
 * @fileoverview Tests for the only() single-element unwrap test-support helper.
 */
import { describe, expect, it } from 'vitest';
import { only } from './only.js';

describe('only', () => {
  it('returns the sole element of a one-element array', () => {
    expect(only(['x'])).toBe('x');
  });

  it('throws when the array is empty', () => {
    expect(() => only([])).toThrow('expected exactly 1 element, received 0');
  });

  it('throws when the array holds more than one element', () => {
    expect(() => only([1, 2, 3])).toThrow('expected exactly 1 element, received 3');
  });
});
