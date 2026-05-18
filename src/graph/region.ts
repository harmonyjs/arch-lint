/**
 * @fileoverview View-region classifier (#26). A region is the union of subtrees
 * of every directory directly containing a JSX-bearing `.tsx` file. This module
 * exposes a pure JSX predicate and a pure id-set classifier; it produces no
 * diagnostics — it feeds the `view` rule pack via `Node.region`.
 */
import { type SourceFile, SyntaxKind } from 'ts-morph';
import { dirOf, isAtOrUnderPrefix } from '#entity-id/index.js';

/** True when the file's AST contains at least one JSX construct (§2.1). */
export function hasJsx(sourceFile: SourceFile): boolean {
  return (
    sourceFile.getFirstDescendantByKind(SyntaxKind.JsxElement) !== undefined ||
    sourceFile.getFirstDescendantByKind(SyntaxKind.JsxSelfClosingElement) !== undefined ||
    sourceFile.getFirstDescendantByKind(SyntaxKind.JsxFragment) !== undefined
  );
}

/**
 * Computes the view region from a JSX-bearing id set (§2.2): the roots are the
 * directories directly holding a JSX-bearing file; the region is every id —
 * file OR folder node — at or below any root. Pure: ids in, id-set out.
 */
export function classifyRegion(
  jsxBearingIds: readonly string[],
  allIds: readonly string[],
): ReadonlySet<string> {
  const roots = new Set(jsxBearingIds.map(dirOf));
  roots.delete('');
  return regionUnder(roots, allIds);
}

/**
 * Computes the view region from an explicit prefix list (config override,
 * §3.2): the region is every id at or below any listed prefix. JSX detection
 * is skipped entirely in this mode.
 */
export function classifyRegionFromPrefixes(
  prefixes: readonly string[],
  allIds: readonly string[],
): ReadonlySet<string> {
  return regionUnder(prefixes, allIds);
}

/** The set of ids at or below any of the given root prefixes. */
function regionUnder(roots: Iterable<string>, allIds: readonly string[]): ReadonlySet<string> {
  const rootList = [...roots];
  const region = new Set<string>();
  for (const id of allIds) {
    if (rootList.some((root) => isAtOrUnderPrefix(id, root))) {
      region.add(id);
    }
  }
  return region;
}
