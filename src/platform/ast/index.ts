/**
 * @fileoverview Public barrel of the AST helpers for the barrels and view packs.
 */
export { sourceFileFor } from '#platform/graph/index.js';
export { assertGraphProjectConsistent } from './assert-consistent.js';
export { fileNodeIds } from './file-nodes.js';
export { type ImportInfo, importsOf } from './import-info.js';
export {
  componentFolderOf,
  isBarrelFile,
  isComponentFolderEntry,
  roleFolderSegment,
} from './node-helpers.js';
