/**
 * @fileoverview Resolves a module specifier to a project file id using the TypeScript
 * module resolver — covers relative paths, extensions, index files and path aliases.
 * Also builds the ModuleResolutionContext from a SourceFileSet's ts-morph project.
 */
import { ts } from 'ts-morph';
import { isDependencyPath } from '#foundation/file-classification/index.js';
import type { SourceFileSet } from '#foundation/source-files/index.js';

export interface ModuleResolutionContext {
  readonly compilerOptions: ts.CompilerOptions;
  readonly moduleResolutionHost: ts.ModuleResolutionHost;
}

export type ModuleResolutionResult =
  | { readonly kind: 'internal'; readonly file: string; readonly linked?: true }
  | { readonly kind: 'external' }
  | { readonly kind: 'unresolved' };

/**
 * Resolves `specifier` as imported from `fromFile`. Returns the absolute resolved
 * file path for project-internal modules, `external` for node_modules, or
 * `unresolved` when nothing matches. A package found through node_modules whose
 * real path lies outside every node_modules is a linked workspace package: it is
 * internal, marked `linked`.
 */
export function resolveSpecifier(
  fromFile: string,
  specifier: string,
  ctx: ModuleResolutionContext,
): ModuleResolutionResult {
  const resolved = ts.resolveModuleName(
    specifier,
    fromFile,
    ctx.compilerOptions,
    ctx.moduleResolutionHost,
  );
  const module = resolved.resolvedModule;
  if (module === undefined) {
    return { kind: 'unresolved' };
  }
  if (module.isExternalLibraryImport !== true) {
    return { kind: 'internal', file: module.resolvedFileName };
  }
  return isDependencyPath(module.resolvedFileName)
    ? { kind: 'external' }
    : { kind: 'internal', file: module.resolvedFileName, linked: true };
}

/** Builds a ModuleResolutionContext backed by the ts-morph Project's compiler state. */
export function moduleResolutionContextOf(set: SourceFileSet): ModuleResolutionContext {
  const program = set.project.getProgram().compilerObject;
  return {
    compilerOptions: program.getCompilerOptions(),
    moduleResolutionHost: set.project.getModuleResolutionHost(),
  };
}
