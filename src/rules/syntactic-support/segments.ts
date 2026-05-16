/**
 * @fileoverview Per-segment splitting of graph node ids and the enforceForSegments predicate (D7).
 */

/** Splits a node id into segments, dropping the extension of the last segment. */
export function segmentsOf(id: string): string[] {
  const trimmed = id.replace(/^\/+/, '').replace(/\/+$/, '');
  if (trimmed === '') return [];
  const parts = trimmed.split('/');
  const last = parts.length - 1;
  parts[last] = parts[last]!.replace(/\.[^./]+$/, '');
  return parts;
}

/**
 * True when the path lies INSIDE a folder named `segment` — the segment matches
 * as a directory, not as a name substring and not as the last (file) segment.
 */
export function isUnderSegment(id: string, segment: string): boolean {
  const segs = segmentsOf(id);
  return segs.slice(0, -1).includes(segment);
}

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
