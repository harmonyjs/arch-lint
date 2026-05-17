/**
 * @fileoverview Builds file-level consumer edges by resolving each import through the
 * syntactic resolver — edges represent post-barrel-unwinding consumer relations (§4.2).
 */
import { type Identifier, Node, type SourceFile } from 'ts-morph';
import {
  type CollectorCtx,
  collectImportedSymbol,
  type EdgeSink,
  locationOf,
  resolveTargetFile,
} from './edges-collectors.js';
import type { Resolver } from './resolve.js';
import type { SourceFileSet } from './source-files.js';
import type { Edge, UnresolvedImport } from './types.js';

export interface EdgeBuildResult {
  readonly edges: readonly Edge[];
  readonly unresolved: readonly UnresolvedImport[];
}

/** Collects edges for `import { ... }` and `import Default from '...'` declarations. */
function collectNamedAndDefaultImports(
  ctx: CollectorCtx,
  fileId: string,
  sourceFile: SourceFile,
): void {
  for (const decl of sourceFile.getImportDeclarations()) {
    for (const named of decl.getNamedImports()) {
      collectImportedSymbol(ctx, fileId, decl, named.getNameNode().getText());
    }
    if (decl.getDefaultImport() !== undefined) {
      collectImportedSymbol(ctx, fileId, decl, 'default');
    }
  }
}

/** Classifies the static uses of a namespace binding into members and whole-object use. */
function classifyNamespaceUses(ns: Identifier): { members: Set<string>; wholeUse: boolean } {
  const members = new Set<string>();
  let wholeUse = false;
  for (const ref of ns.findReferencesAsNodes()) {
    if (ref === ns) {
      continue;
    }
    const parent = ref.getParent();
    if (
      parent !== undefined &&
      Node.isPropertyAccessExpression(parent) &&
      parent.getExpression() === ref
    ) {
      members.add(parent.getNameNode().getText());
    } else {
      wholeUse = true;
    }
  }
  return { members, wholeUse };
}

/**
 * Models namespace imports (`import * as ns from './m'`): each statically resolvable
 * `ns.member` access becomes an edge to `resolveExport(m, 'member')`; using `ns`
 * itself as a value yields an unresolved entry.
 */
function collectNamespaceImports(ctx: CollectorCtx, fileId: string, sourceFile: SourceFile): void {
  for (const decl of sourceFile.getImportDeclarations()) {
    const ns = decl.getNamespaceImport();
    if (ns === undefined) {
      continue;
    }
    const specifier = decl.getModuleSpecifierValue();
    const { members, wholeUse } = classifyNamespaceUses(ns);
    for (const member of members) {
      collectImportedSymbol(ctx, fileId, decl, member);
    }
    if (wholeUse && resolveTargetFile(fileId, specifier, ctx.set).kind !== 'external') {
      ctx.sink.unresolved.push({
        file: fileId,
        specifier,
        symbol: ns.getText(),
        location: locationOf(decl, fileId),
        reason: 'missing',
      });
    }
  }
}

/**
 * Builds consumer edges for the whole source set. `resolved` outcomes become edges
 * pointing at the native declaration; `unresolved` outcomes are collected;
 * `external`/`cycle` leave no trace. `treatTypeOnlyAsEdge: false` drops type-only edges.
 */
export function buildEdges(
  set: SourceFileSet,
  resolver: Resolver,
  treatTypeOnlyAsEdge: boolean,
): EdgeBuildResult {
  const sink: EdgeSink = { edges: [], unresolved: [] };
  const ctx: CollectorCtx = { set, resolver, sink };
  for (const [fileId, sourceFile] of set.files) {
    collectNamedAndDefaultImports(ctx, fileId, sourceFile);
    collectNamespaceImports(ctx, fileId, sourceFile);
  }
  const keptEdges = treatTypeOnlyAsEdge ? sink.edges : sink.edges.filter((e) => !e.typeOnly);
  return { edges: keptEdges, unresolved: sink.unresolved };
}
