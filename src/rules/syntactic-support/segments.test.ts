/**
 * @fileoverview Tests for the enforceForSegments predicate (D7).
 */
import { describe, expect, it } from 'vitest';
import { enforceForSegmentsMatches } from './segments.js';

describe('enforceForSegmentsMatches', () => {
  it("'all' matches any path", () => {
    expect(enforceForSegmentsMatches('all', 'src/App/Foo', ['lib', 'model'])).toBe(true);
  });

  it('an array matches a path under one of the segments', () => {
    expect(enforceForSegmentsMatches(['lib'], 'src/App/lib/u.ts', ['lib', 'model'])).toBe(true);
  });

  it('an array does not match a path outside the listed segments', () => {
    expect(enforceForSegmentsMatches(['lib'], 'src/App/Foo/Foo.tsx', ['lib', 'model'])).toBe(false);
  });

  it('an empty array matches nothing', () => {
    expect(enforceForSegmentsMatches([], 'src/App/lib/u.ts', ['lib', 'model'])).toBe(false);
  });
});
