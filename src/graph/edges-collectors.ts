/**
 * @fileoverview Shared edge-collection primitives — module-target resolution and the
 * conversion of a single imported symbol into an edge or an unresolved-import entry.
 */
import type { ImportDeclaration, Node } from 'ts-morph';
import type { Edge, Location, Resolution, UnresolvedImport } from '../types.js';
import { resolveSpecifier } from './module-resolution.js';
import type { Resolver } from './resolve.js';
import { fileIdOf, moduleResolutionContextOf, type SourceFileSet } from './source-files.js';

/** Mutable accumulators threaded through the per-file edge collectors. */
export interface EdgeSink {
  readonly edges: Edge[];
  readonly unresolved: UnresolvedImport[];
}

/** Per-build collaboration surface: the source set, resolver and output sink. */
export interface CollectorCtx {
  readonly set: SourceFileSet;
  readonly resolver: Resolver;
  readonly sink: EdgeSink;
}

type TargetFile =
  | { kind: 'internal'; file: string }
  | { kind: 'external' }
  | { kind: 'unresolved' };

/** 1-based source location of an import declaration's start. */
export function locationOf(decl: Node, fileId: string): Location {
  const start = decl.getStart();
  const pos = decl.getSourceFile().getLineAndColumnAtPos(start);
  return { file: fileId, line: pos.line, column: pos.column };
}

/** Resolves a target module specifier to an internal file id, if any. */
export function resolveTargetFile(
  fromFile: string,
  specifier: string,
  set: SourceFileSet,
): TargetFile {
  const abs = `${set.cwd}/${fromFile}`;
  const r = resolveSpecifier(abs, specifier, moduleResolutionContextOf(set));
  if (r.kind !== 'internal') {
    return r;
  }
  const id = fileIdOf(r.file, set);
  return set.files.has(id) ? { kind: 'internal', file: id } : { kind: 'unresolved' };
}

/** Identifies one imported symbol and the declaration it came from. */
interface ImportSite {
  readonly fileId: string;
  readonly decl: ImportDeclaration;
  readonly specifier: string;
  readonly symbol: string;
}

/** Pushes an unresolved entry unless the target specifier is external (then skip). */
function recordUnresolved(
  target: 'external' | 'unresolved',
  site: ImportSite,
  sink: EdgeSink,
): void {
  if (target === 'external') {
    return;
  }
  sink.unresolved.push({
    file: site.fileId,
    specifier: site.specifier,
    symbol: site.symbol,
    location: locationOf(site.decl, site.fileId),
    reason: 'alias-unresolved',
  });
}

/** Turns a Resolution into an edge or an unresolved entry. */
function applyResolution(site: ImportSite, resolution: Resolution, sink: EdgeSink): void {
  if (resolution.kind === 'resolved') {
    sink.edges.push({
      consumer: site.fileId,
      producer: resolution.file,
      symbol: resolution.symbol,
      typeOnly: resolution.typeOnly || site.decl.isTypeOnly(),
      syntacticPath: site.specifier,
    });
    return;
  }
  if (resolution.kind === 'external' || resolution.kind === 'cycle') {
    return;
  }
  sink.unresolved.push({
    file: site.fileId,
    specifier: site.specifier,
    symbol: site.symbol,
    location: locationOf(site.decl, site.fileId),
    reason: resolution.reason,
  });
}

/** Resolves one imported symbol against the resolver and records the outcome. */
export function collectImportedSymbol(
  ctx: CollectorCtx,
  fileId: string,
  decl: ImportDeclaration,
  symbol: string,
): void {
  const specifier = decl.getModuleSpecifierValue();
  const site: ImportSite = { fileId, decl, specifier, symbol };
  const target = resolveTargetFile(fileId, specifier, ctx.set);
  if (target.kind !== 'internal') {
    recordUnresolved(target.kind, site, ctx.sink);
    return;
  }
  applyResolution(site, ctx.resolver.resolveExport(target.file, symbol), ctx.sink);
}
