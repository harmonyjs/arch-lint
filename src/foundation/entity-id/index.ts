/**
 * @fileoverview Public barrel of entity-id — POSIX path arithmetic over entity
 * ids plus the segment predicate built on top of it.
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
  relativeToRoot,
  segmentsOf,
  stemOf,
} from './path-arithmetic.js';
export { enforceForSegmentsMatches } from './segments.js';
