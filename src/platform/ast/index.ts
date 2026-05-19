/**
 * @fileoverview Public barrel of the AST helpers for the barrels and view packs.
 */
export { sourceFileFor } from '#foundation/ts-project/index.js';
export { assertGraphProjectConsistent } from './assert-consistent.js';
export { fileNodeIds } from './find-source-file.js';
export { type ImportInfo, importsOf } from './import-info.js';
export {
  componentFolderOf,
  isBarrelFile,
  isComponentFolderEntry,
  roleFolderSegment,
} from './node-helpers.js';
