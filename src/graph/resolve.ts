/**
 * @fileoverview Syntactic export resolver — unwinds barrel re-export chains down to a
 * native declaration without invoking the TypeScript type-checker.
 */

import type { ModuleResolutionContext } from './module-resolution.js';
import { findNativeDeclaration } from './resolve-declarations.js';
import { type ReExportContext, resolveReExport } from './resolve-reexports.js';
import type { SourceFileSet } from './discover-source-files.js';
import type { Resolution } from './types.js';

export interface ResolverContext {
  readonly sources: SourceFileSet;
  readonly moduleResolution: ModuleResolutionContext;
  readonly maxResolveDepth: number;
  readonly cacheSize: number;
}

export interface Resolver {
  resolveExport(file: string, name: string): Resolution;
  readonly cache: ReadonlyMap<string, Resolution>;
  readonly reverseIndex: ReadonlyMap<string, ReadonlySet<string>>;
}

/** Mutable resolver state shared across the recursive resolution helpers. */
interface ResolverState {
  readonly ctx: ResolverContext;
  readonly cache: Map<string, Resolution>;
  readonly reverseIndex: Map<string, Set<string>>;
}

const cacheKeyOf = (file: string, name: string): string => `${file}#${name}`;

/** True if a resolution depends on the traversal path and must not be cached. */
function isPathDependent(result: Resolution): boolean {
  return (
    result.kind === 'cycle' || (result.kind === 'unresolved' && result.reason === 'depth-exceeded')
  );
}

/** Records, for every touched file, that `cacheKey` depended on it (LRU-immune). */
function registerReverse(
  state: ResolverState,
  touched: ReadonlySet<string>,
  cacheKey: string,
): void {
  for (const f of touched) {
    let bucket = state.reverseIndex.get(f);
    if (bucket === undefined) {
      bucket = new Set<string>();
      state.reverseIndex.set(f, bucket);
    }
    bucket.add(cacheKey);
  }
}

/** Caches a result unless it is path-dependent (cycle / depth-exceeded). */
function cacheResult(
  state: ResolverState,
  key: string,
  result: Resolution,
  localTouched: Set<string>,
): void {
  if (isPathDependent(result) || state.ctx.cacheSize <= 0) {
    return;
  }
  if (state.cache.size >= state.ctx.cacheSize) {
    const oldest = state.cache.keys().next().value;
    if (oldest !== undefined) {
      state.cache.delete(oldest);
    }
  }
  state.cache.set(key, result);
  registerReverse(state, localTouched, key);
}

/** A resolution request: the target file/name plus the live traversal state. */
interface ResolveArgs {
  readonly file: string;
  readonly name: string;
  readonly seen: Set<string>;
  readonly touched: Set<string>;
}

/** §5.1: native declaration in this file, else a re-export branch. */
function compute(
  state: ResolverState,
  reExportCtx: ReExportContext,
  args: ResolveArgs,
): Resolution {
  const sourceFile = state.ctx.sources.files.get(args.file);
  if (sourceFile === undefined) {
    return { kind: 'unresolved', reason: 'parse-error' };
  }
  const native = findNativeDeclaration(sourceFile, args.file, args.name);
  if (native !== undefined) {
    return native;
  }
  return resolveReExport(reExportCtx, sourceFile, args.file, {
    name: args.name,
    seen: args.seen,
    touched: args.touched,
  });
}

/**
 * Recursive core: resolves `name` from `file`, honoring the cache, the cycle guard
 * (`seen`) and the depth limit, while accumulating touched files.
 */
function resolveInner(
  state: ResolverState,
  reExportCtx: ReExportContext,
  args: ResolveArgs,
): Resolution {
  const key = cacheKeyOf(args.file, args.name);
  args.touched.add(args.file);
  const cached = state.cache.get(key);
  if (cached !== undefined) {
    registerReverse(state, args.touched, key);
    return cached;
  }
  if (args.seen.has(key)) {
    return { kind: 'cycle' };
  }
  if (args.seen.size >= state.ctx.maxResolveDepth) {
    return { kind: 'unresolved', reason: 'depth-exceeded' };
  }
  args.seen.add(key);
  const localTouched = new Set<string>([args.file]);
  const result = compute(state, reExportCtx, { ...args, touched: localTouched });
  args.seen.delete(key);
  for (const f of localTouched) {
    args.touched.add(f);
  }
  cacheResult(state, key, result, localTouched);
  return result;
}

/**
 * Creates a resolver over a parsed source set. Each top-level `resolveExport`
 * call gets a fresh `seen` set so that distinct import sites never produce a
 * false `cycle`. `cycle` and `depth-exceeded` results are path-dependent and are
 * never cached. A reverse index (`touchedFile -> cacheKeys`) is kept LRU-immune.
 */
export function createResolver(ctx: ResolverContext): Resolver {
  const state: ResolverState = {
    ctx,
    cache: new Map<string, Resolution>(),
    reverseIndex: new Map<string, Set<string>>(),
  };
  const reExportCtx: ReExportContext = {
    sources: ctx.sources,
    moduleResolution: ctx.moduleResolution,
    resolveInner: (file, name, seen, touched) =>
      resolveInner(state, reExportCtx, { file, name, seen, touched }),
  };
  return {
    resolveExport: (file, name) =>
      resolveInner(state, reExportCtx, {
        file,
        name,
        seen: new Set<string>(),
        touched: new Set<string>(),
      }),
    cache: state.cache,
    reverseIndex: state.reverseIndex,
  };
}
