/**
 * @fileoverview Public barrel of the syntactic-support helpers for the barrels and view packs.
 */
export { assertGraphProjectConsistent } from './assert-consistent.js';
export { dedupByFingerprint } from './dedup.js';
export { fileNodeIds, sourceFileFor } from './find-source-file.js';
export { type ImportInfo, importsOf } from './import-info.js';
export {
  componentFolderOf,
  isBarrelFile,
  isComponentFolderEntry,
  roleFolderSegment,
} from './node-helpers.js';
export { enforceForSegmentsMatches } from './segments.js';
