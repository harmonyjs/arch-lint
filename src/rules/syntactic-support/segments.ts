/**
 * @fileoverview The enforceForSegments predicate (D7). Path-segment splitting and
 * the under-segment test now live in `src/entity-id/`; they are re-exported here
 * so the barrels and view packs keep importing them from one place.
 */
import { isUnderSegment, segmentsOf } from '#entity-id.js';

export { isUnderSegment, segmentsOf };

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
