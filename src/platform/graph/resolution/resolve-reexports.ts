/**
 * @fileoverview Re-export hop resolution — named and wildcard barrel unwinding.
 */
import { Node, type SourceFile } from 'ts-morph';
import { fileIdOf, type SourceFileSet } from '#foundation/source-files/index.js';
import type { Resolution } from '#platform/graph/types.js';
import type { ModuleResolutionContext } from './module-resolution.js';
import { resolveSpecifier } from './module-resolution.js';
import { ownExportNames } from './resolve-declarations.js';

/** A module specifier classified relative to the parsed source set. */
export type TargetResolution =
  | { readonly kind: 'internal'; readonly file: string }
  | { readonly kind: 'external' }
  | { readonly kind: 'unresolved' };

/** Collaboration surface the re-export engine needs from the owning resolver. */
export interface ReExportContext {
  readonly sources: SourceFileSet;
  readonly moduleResolution: ModuleResolutionContext;
  resolveInner(file: string, name: string, seen: Set<string>, touched: Set<string>): Resolution;
}

/** One re-export hop: the barrel file being scanned and the live traversal state. */
interface Hop {
  readonly sourceFile: SourceFile;
  readonly fromFile: string;
  readonly name: string;
  readonly seen: Set<string>;
  readonly touched: Set<string>;
}

/** Resolves a module specifier to a project file id, mapping outcomes. */
export function resolveTarget(
  ctx: ReExportContext,
  fromFile: string,
  specifier: string,
): TargetResolution {
  const absFrom = `${ctx.sources.cwd}/${fromFile}`;
  const result = resolveSpecifier(absFrom, specifier, ctx.moduleResolution);
  if (result.kind !== 'internal') {
    return result;
  }
  const id = fileIdOf(result.file, ctx.sources);
  if (!ctx.sources.files.has(id)) {
    return result.linked === true ? { kind: 'external' } : { kind: 'unresolved' };
  }
  return { kind: 'internal', file: id };
}

/** Collects the resolved targets of every plain `export *` in `sourceFile`. */
function wildcardTargets(
  ctx: ReExportContext,
  sourceFile: SourceFile,
  fromFile: string,
): TargetResolution[] {
  const targets: TargetResolution[] = [];
  for (const statement of sourceFile.getStatements()) {
    if (!Node.isExportDeclaration(statement) || !statement.isNamespaceExport()) {
      continue;
    }
    const spec = statement.getModuleSpecifier();
    if (statement.getNamespaceExport() === undefined && spec !== undefined) {
      targets.push(resolveTarget(ctx, fromFile, spec.getLiteralValue()));
    }
  }
  return targets;
}

/** True if `name` is reachable from `file` via own exports or transitive `export *`. */
function wildcardReachable(
  ctx: ReExportContext,
  probe: { sourceFile: SourceFile; file: string; name: string },
  visited: Set<string>,
): boolean {
  if (visited.has(probe.file)) {
    return false;
  }
  visited.add(probe.file);
  if (ownExportNames(probe.sourceFile).has(probe.name)) {
    return true;
  }
  for (const target of wildcardTargets(ctx, probe.sourceFile, probe.file)) {
    if (target.kind !== 'internal') {
      continue;
    }
    const targetFile = ctx.sources.files.get(target.file);
    if (targetFile === undefined) {
      continue;
    }
    if (
      wildcardReachable(
        ctx,
        { sourceFile: targetFile, file: target.file, name: probe.name },
        visited,
      )
    ) {
      return true;
    }
  }
  return false;
}

/** Picks the wildcard outcome: a single target resolves, many → ambiguous. */
function reduceWildcard(
  ctx: ReExportContext,
  internalTargets: readonly string[],
  hop: Hop,
  hasExternalCandidate: boolean,
): Resolution {
  if (internalTargets.length === 1) {
    return ctx.resolveInner(internalTargets[0] as string, hop.name, hop.seen, hop.touched);
  }
  if (internalTargets.length > 1) {
    return { kind: 'unresolved', reason: 'ambiguous-wildcard' };
  }
  if (hasExternalCandidate) {
    return { kind: 'external' };
  }
  return { kind: 'unresolved', reason: 'missing' };
}

/** Follows a matched `export { orig as name } from '...'` spec through one hop. */
function followNamedReExportSpec(
  ctx: ReExportContext,
  hop: Hop,
  match: { originalName: string; specifier: string; hopTypeOnly: boolean },
): Resolution {
  const target = resolveTarget(ctx, hop.fromFile, match.specifier);
  if (target.kind !== 'internal') {
    return target.kind === 'external'
      ? { kind: 'external' }
      : { kind: 'unresolved', reason: 'alias-unresolved' };
  }
  const inner = ctx.resolveInner(target.file, match.originalName, hop.seen, hop.touched);
  return inner.kind === 'resolved' && match.hopTypeOnly ? { ...inner, typeOnly: true } : inner;
}

/** Resolves `hop.name` against a single `export ... from '...'` statement, if it matches. */
function resolveNamedReExportStatement(
  ctx: ReExportContext,
  hop: Hop,
  statement: Node,
): Resolution | undefined {
  if (!Node.isExportDeclaration(statement)) {
    return undefined;
  }
  const moduleSpec = statement.getModuleSpecifier();
  if (moduleSpec === undefined) {
    return undefined;
  }
  for (const spec of statement.getNamedExports()) {
    const exposedName = spec.getAliasNode()?.getText() ?? spec.getNameNode().getText();
    if (exposedName !== hop.name) {
      continue;
    }
    return followNamedReExportSpec(ctx, hop, {
      originalName: spec.getNameNode().getText(),
      specifier: moduleSpec.getLiteralValue(),
      hopTypeOnly: statement.isTypeOnly() || spec.isTypeOnly(),
    });
  }
  return undefined;
}

/** §5.1 step 2: resolves `export { orig as name } from '...'` if present. */
function resolveNamedReExport(ctx: ReExportContext, hop: Hop): Resolution | undefined {
  for (const statement of hop.sourceFile.getStatements()) {
    const resolved = resolveNamedReExportStatement(ctx, hop, statement);
    if (resolved !== undefined) {
      return resolved;
    }
  }
  return undefined;
}

/** §5.1 step 3: best-effort `export * from '...'` barrel unwinding. */
function resolveWildcardReExport(ctx: ReExportContext, hop: Hop): Resolution {
  const internalTargets: string[] = [];
  let hasExternalCandidate = false;
  for (const target of wildcardTargets(ctx, hop.sourceFile, hop.fromFile)) {
    if (target.kind === 'external') {
      hasExternalCandidate = true;
      continue;
    }
    if (target.kind === 'unresolved') {
      continue;
    }
    hop.touched.add(target.file);
    const targetFile = ctx.sources.files.get(target.file);
    if (
      targetFile !== undefined &&
      wildcardReachable(
        ctx,
        { sourceFile: targetFile, file: target.file, name: hop.name },
        new Set(hop.seen),
      )
    ) {
      internalTargets.push(target.file);
    }
  }
  return reduceWildcard(ctx, internalTargets, hop, hasExternalCandidate);
}

/** Resolves `name` via a re-export hop — named (§5.1 step 2) first, then wildcard. */
export function resolveReExport(
  ctx: ReExportContext,
  sourceFile: SourceFile,
  fromFile: string,
  request: { name: string; seen: Set<string>; touched: Set<string> },
): Resolution {
  const hop: Hop = { sourceFile, fromFile, ...request };
  return resolveNamedReExport(ctx, hop) ?? resolveWildcardReExport(ctx, hop);
}
