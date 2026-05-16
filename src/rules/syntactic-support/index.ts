/**
 * @fileoverview Public barrel of the syntactic-support helpers for the barrels and view packs.
 */
export { dedupByFingerprint } from './dedup.js';
export { segmentsOf, isUnderSegment, enforceForSegmentsMatches } from './segments.js';
export { sourceFileFor, fileNodeIds } from './source-files.js';
export { importsOf, type ImportInfo } from './import-info.js';
export {
  isBarrelFile,
  isComponentFolderEntry,
  componentFolderOf,
  roleFolderSegment,
} from './node-helpers.js';
