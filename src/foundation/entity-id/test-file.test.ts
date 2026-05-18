/**
 * @fileoverview Tests for the test-file predicate.
 */
import { describe, expect, it } from 'vitest';
import { isTestFile } from './test-file.js';

describe('isTestFile', () => {
  it('is true for a *.test.* name', () => {
    expect(isTestFile('App.test.tsx')).toBe(true);
  });

  it('is false for a plain source name', () => {
    expect(isTestFile('App.tsx')).toBe(false);
  });

  it('is false for a name that merely contains "test" without the dotted infix', () => {
    expect(isTestFile('tester.ts')).toBe(false);
  });

  it('is false for a bare ".test.ts" dotfile (empty name segment)', () => {
    expect(isTestFile('.test.ts')).toBe(false);
  });

  it('is true when a non-empty name segment precedes ".test."', () => {
    expect(isTestFile('a.test.ts')).toBe(true);
  });
});
