/**
 * @fileoverview Tests for matching an import specifier against triggerPackages via picomatch.
 */
import { describe, it, expect } from 'vitest';
import { triggerPackageMatcher } from './matcher.js';

describe('triggerPackageMatcher', () => {
  it('matches an exact package name', () => {
    const match = triggerPackageMatcher(['react-aria']);
    expect(match('react-aria')).toBe(true);
    expect(match('react-dom')).toBe(false);
  });

  it('matches a scoped package by glob', () => {
    const match = triggerPackageMatcher(['@react-aria/*']);
    expect(match('@react-aria/button')).toBe(true);
    expect(match('@react-aria/interactions')).toBe(true);
    expect(match('@react-stately/toggle')).toBe(false);
  });

  it('matches a package subpath', () => {
    const match = triggerPackageMatcher(['lodash/*']);
    expect(match('lodash/debounce')).toBe(true);
  });

  it('does not match a relative import', () => {
    const match = triggerPackageMatcher(['@react-aria/*']);
    expect(match('./local')).toBe(false);
    expect(match('../tokens')).toBe(false);
  });

  it('an empty list matches nothing', () => {
    expect(triggerPackageMatcher([])('react-aria')).toBe(false);
  });

  it('matches when at least one pattern matches', () => {
    const match = triggerPackageMatcher(['@react-aria/*', '@react-stately/*']);
    expect(match('@react-stately/toggle')).toBe(true);
  });
});
