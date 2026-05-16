/**
 * @fileoverview Tests for path-segment splitting and the enforceForSegments predicate (D7).
 */
import { describe, expect, it } from 'vitest';
import { enforceForSegmentsMatches, isUnderSegment, segmentsOf } from './segments.js';

describe('segmentsOf', () => {
  it('splits a path into segments', () => {
    expect(segmentsOf('src/App/items/Foo')).toEqual(['src', 'App', 'items', 'Foo']);
  });

  it('drops the extension of the last segment', () => {
    expect(segmentsOf('src/App/App.tsx')).toEqual(['src', 'App', 'App']);
  });

  it('normalizes leading and trailing slashes', () => {
    expect(segmentsOf('/src/App/')).toEqual(['src', 'App']);
  });

  it('returns an empty array for the empty string', () => {
    expect(segmentsOf('')).toEqual([]);
  });
});

describe('isUnderSegment', () => {
  it('is true when the path contains the segment folder', () => {
    expect(isUnderSegment('src/App/lib/util.ts', 'lib')).toBe(true);
  });

  it('is false when the segment matched only as a name substring', () => {
    expect(isUnderSegment('src/App/library/util.ts', 'lib')).toBe(false);
  });

  it('is false when the segment is the last (file) segment itself', () => {
    expect(isUnderSegment('src/App/lib.ts', 'lib')).toBe(false);
  });
});

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
