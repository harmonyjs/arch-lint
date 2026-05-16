/**
 * @fileoverview File function-declaration scanner — the shared source of function-level
 * units that the per-function perfile rules consume.
 */
import { Node } from 'ts-morph';
import type { SourceFile } from 'ts-morph';
import { qualifiedFunctionPath } from './qualified-path.js';

/** A function-level unit of a file: its ts-morph node plus its qualified function path. */
export interface FunctionUnit {
  readonly node: Node;
  readonly qualifiedPath: string;
}

/** True when the node is one of the four function-like kinds. */
function isFunctionLike(node: Node): boolean {
  return (
    Node.isFunctionDeclaration(node) ||
    Node.isMethodDeclaration(node) ||
    Node.isArrowFunction(node) ||
    Node.isFunctionExpression(node)
  );
}

/** Collects every function declaration of a file as a FunctionUnit. */
export function collectFunctions(sf: SourceFile): readonly FunctionUnit[] {
  const units: FunctionUnit[] = [];
  sf.forEachDescendant((node) => {
    if (isFunctionLike(node)) {
      units.push({ node, qualifiedPath: qualifiedFunctionPath(node) });
    }
  });
  return units;
}
