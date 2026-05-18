/**
 * @fileoverview Public barrel of entity-id — POSIX path arithmetic over entity
 * ids plus the segment and test-file predicates built on top of it.
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
export { isTestFile } from './test-file.js';
