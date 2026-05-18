/**
 * @fileoverview Public barrel of the import-resolution pipeline — module
 * resolution, declaration and re-export resolution, and edge collection.
 */

export {
  type CollectorCtx,
  collectImportedSymbol,
  type EdgeSink,
  locationOf,
  resolveTargetFile,
} from './edges-collectors.js';
export {
  type ModuleResolutionContext,
  type ModuleResolutionResult,
  resolveSpecifier,
} from './module-resolution.js';
export { createResolver, type Resolver, type ResolverContext } from './resolve.js';
export { findNativeDeclaration, ownExportNames } from './resolve-declarations.js';
export {
  type ReExportContext,
  resolveReExport,
  resolveTarget,
  type TargetResolution,
} from './resolve-reexports.js';
