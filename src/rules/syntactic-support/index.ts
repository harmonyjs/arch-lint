/**
 * @fileoverview Public barrel of the syntactic-support helpers for the barrels and view packs.
 */
export { dedupByFingerprint } from './dedup.js';
export { type ImportInfo, importsOf } from './import-info.js';
export {
  componentFolderOf,
  isBarrelFile,
  isComponentFolderEntry,
  roleFolderSegment,
} from './node-helpers.js';
export { enforceForSegmentsMatches, isUnderSegment, segmentsOf } from './segments.js';
export { fileNodeIds, sourceFileFor } from './source-files.js';
