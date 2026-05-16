/**
 * @fileoverview Qualified function path builder — a stable function discriminator for
 * perfile fingerprints (§10.2): a chain of named scopes joined by dots.
 */
import { Node, SyntaxKind } from 'ts-morph';

/** True when the node is one of the four function-like kinds. */
function isFunctionLike(node: Node): boolean {
  return (
    Node.isFunctionDeclaration(node) ||
    Node.isMethodDeclaration(node) ||
    Node.isArrowFunction(node) ||
    Node.isFunctionExpression(node)
  );
}

/** Path segment for a single function node, or null when the node is anonymous. */
function segmentOf(fn: Node): string | null {
  if (Node.isFunctionDeclaration(fn)) return fn.getName() ?? 'default';
  if (Node.isMethodDeclaration(fn)) return fn.getName();
  const parent = fn.getParent();
  if (parent && Node.isVariableDeclaration(parent)) return parent.getName();
  if (parent && Node.isPropertyAssignment(parent)) return parent.getName();
  if (parent && Node.isExportAssignment(parent)) return 'default';
  return null;
}

/**
 * Container name a function's own segment must be qualified by — the enclosing
 * class for a method, the enclosing variable for a property-assignment arrow.
 * Returns null when the function has no such container.
 */
function containerPrefix(fn: Node): string | null {
  if (Node.isMethodDeclaration(fn)) {
    const cls = fn.getFirstAncestor(
      (n): n is Node => Node.isClassDeclaration(n) || Node.isClassExpression(n),
    );
    if (cls && (Node.isClassDeclaration(cls) || Node.isClassExpression(cls))) {
      return cls.getName() ?? null;
    }
    return null;
  }
  const parent = fn.getParent();
  if (parent && Node.isPropertyAssignment(parent)) {
    const varDecl = parent.getFirstAncestorByKind(SyntaxKind.VariableDeclaration);
    return varDecl ? varDecl.getName() : null;
  }
  return null;
}

/** The nearest function-like ancestor that carries a name segment. */
function namedAncestor(fn: Node): Node | undefined {
  let cur = fn.getParent();
  while (cur) {
    if (isFunctionLike(cur) && segmentOf(cur) !== null) return cur;
    cur = cur.getParent();
  }
  return undefined;
}

/** Index of an anonymous function among anonymous siblings under a shared named ancestor. */
function anonymousIndex(fn: Node): number {
  const ancestor = namedAncestor(fn);
  const scope = ancestor ?? fn.getSourceFile();
  let index = 0;
  let found = 0;
  scope.forEachDescendant((node) => {
    if (!isFunctionLike(node)) return;
    if (namedAncestor(node) !== ancestor) return;
    if (segmentOf(node) !== null) return;
    if (node === fn) found = index;
    index += 1;
  });
  return found;
}

/**
 * Builds the qualified function path for a function-like node (§10.2): a chain of
 * named scopes joined by '.', with anonymous callbacks rendered as '<ancestor>#cbN'.
 */
export function qualifiedFunctionPath(fn: Node): string {
  const segment = segmentOf(fn);
  const ancestor = namedAncestor(fn);
  const ancestorPrefix = ancestor ? qualifiedFunctionPath(ancestor) : '';
  if (segment === null) {
    const tail = `cb${anonymousIndex(fn)}`;
    return ancestorPrefix ? `${ancestorPrefix}#${tail}` : tail;
  }
  const container = containerPrefix(fn);
  const own = container ? `${container}.${segment}` : segment;
  return ancestorPrefix ? `${ancestorPrefix}.${own}` : own;
}
