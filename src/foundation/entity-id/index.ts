/**
 * @fileoverview Public barrel of entity-id — POSIX path arithmetic over entity
 * ids plus the enforceForSegments predicate built on top of it.
 */
export {
  ancestorsOf,
  baseNameOf,
  dirOf,
  dropExtension,
  firstSegment,
  folderOf,
  isAtOrUnderPrefix,
  isStrictlyUnderPrefix,
  isUnderSegment,
  segmentsOf,
  stemOf,
} from './path-arithmetic.js';
export { enforceForSegmentsMatches } from './segments.js';
