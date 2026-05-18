/**
 * @fileoverview The enforceForSegments predicate (D7). Path-segment splitting and
 * the under-segment test live in `src/entity-id/`; this module only adds the
 * setting-aware predicate on top of them.
 */
import { isUnderSegment } from './path-arithmetic.js';

/**
 * The enforceForSegments predicate (D7): `'all'` matches any path; an array
 * matches only a path that lies under one of the listed role segments.
 * `knownSegments` is accepted for symmetry but the array is taken verbatim.
 */
export function enforceForSegmentsMatches(
  setting: 'all' | readonly string[],
  id: string,
  _knownSegments: readonly string[],
): boolean {
  if (setting === 'all') return true;
  return setting.some((segment) => isUnderSegment(id, segment));
}
