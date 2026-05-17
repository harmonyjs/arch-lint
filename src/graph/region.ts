/**
 * @fileoverview View-region classifier (#26). A region is the union of subtrees
 * of every directory directly containing a JSX-bearing `.tsx` file. This module
 * exposes a pure JSX predicate and a pure id-set classifier; it produces no
 * diagnostics — it feeds the `view` rule pack via `Node.region`.
 */
import { type SourceFile, SyntaxKind } from 'ts-morph';

/** True when the file's AST contains at least one JSX construct (§2.1). */
export function hasJsx(sourceFile: SourceFile): boolean {
  return (
    sourceFile.getFirstDescendantByKind(SyntaxKind.JsxElement) !== undefined ||
    sourceFile.getFirstDescendantByKind(SyntaxKind.JsxSelfClosingElement) !== undefined ||
    sourceFile.getFirstDescendantByKind(SyntaxKind.JsxFragment) !== undefined
  );
}
