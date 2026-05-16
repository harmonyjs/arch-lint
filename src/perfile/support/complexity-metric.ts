/**
 * @fileoverview Cognitive-complexity engine (SonarSource) — penalizes nesting and
 * control-flow breaks rather than path count (D4). Normative source: G. Ann Campbell,
 * "Cognitive Complexity — A new way of measuring understandability", SonarSource 2018.
 */
import { Node, SyntaxKind } from 'ts-morph';

/** Structural nodes (except IfStatement, which walkIf scores) — each gives +1 + nesting. */
function isStructural(node: Node): boolean {
  const kind = node.getKind();
  return (
    kind === SyntaxKind.ConditionalExpression ||
    kind === SyntaxKind.SwitchStatement ||
    kind === SyntaxKind.ForStatement ||
    kind === SyntaxKind.ForInStatement ||
    kind === SyntaxKind.ForOfStatement ||
    kind === SyntaxKind.WhileStatement ||
    kind === SyntaxKind.DoStatement ||
    kind === SyntaxKind.CatchClause
  );
}

/** Nodes whose body raises the nesting level for descendants. */
function increasesNesting(node: Node): boolean {
  const kind = node.getKind();
  return (
    kind === SyntaxKind.IfStatement ||
    kind === SyntaxKind.ConditionalExpression ||
    kind === SyntaxKind.SwitchStatement ||
    kind === SyntaxKind.ForStatement ||
    kind === SyntaxKind.ForInStatement ||
    kind === SyntaxKind.ForOfStatement ||
    kind === SyntaxKind.WhileStatement ||
    kind === SyntaxKind.DoStatement ||
    kind === SyntaxKind.CatchClause ||
    Node.isFunctionDeclaration(node) ||
    Node.isFunctionExpression(node) ||
    Node.isArrowFunction(node) ||
    Node.isMethodDeclaration(node)
  );
}

/**
 * Scores one IfStatement together with its else chain. The `if` gets +1 structural
 * and +nesting; each `else`/`else if` gets +1 flat with no nesting penalty (D4).
 */
function walkIf(ifNode: Node, nesting: number): number {
  if (!Node.isIfStatement(ifNode)) return 0;
  let total = 1 + nesting;
  total += walk(ifNode.getThenStatement(), nesting + 1);
  const elseStmt = ifNode.getElseStatement();
  if (!elseStmt) return total;
  total += 1;
  if (Node.isIfStatement(elseStmt)) {
    // else-if: recurse but strip the nested if's own structural+nesting (it is flat).
    total += walkIf(elseStmt, nesting) - (1 + nesting);
  } else {
    total += walk(elseStmt, nesting + 1);
  }
  return total;
}

/** Recursive body walk tracking nesting; returns the accumulated complexity. */
function walk(node: Node, nesting: number): number {
  let total = 0;
  for (const child of node.getChildren()) {
    if (Node.isIfStatement(child)) {
      total += walkIf(child, nesting);
      continue;
    }
    if (isStructural(child)) total += 1 + nesting;
    const childNesting = increasesNesting(child) ? nesting + 1 : nesting;
    total += walk(child, childNesting);
  }
  return total;
}

/** Returns the operator of a node when it is && or ||; null otherwise (?? excluded). */
function logicalOperator(node: Node): '&&' | '||' | null {
  if (!Node.isBinaryExpression(node)) return null;
  const op = node.getOperatorToken().getKind();
  if (op === SyntaxKind.AmpersandAmpersandToken) return '&&';
  if (op === SyntaxKind.BarBarToken) return '||';
  return null;
}

/** Counts boolean operator sequences: an operator change starts a new sequence. */
function booleanSequences(scope: Node): number {
  let total = 0;
  scope.forEachDescendant((node) => {
    const op = logicalOperator(node);
    if (op === null) return;
    const parent = node.getParent();
    if (parent === undefined || logicalOperator(parent) !== op) total += 1;
  });
  return total;
}

/** Name of a function-like node for recursion detection, or null. */
function functionName(fn: Node): string | null {
  if (Node.isFunctionDeclaration(fn) || Node.isMethodDeclaration(fn)) {
    return fn.getName() ?? null;
  }
  const parent = fn.getParent();
  if (parent && Node.isVariableDeclaration(parent)) return parent.getName();
  return null;
}

/** Counts calls inside fn whose callee identifier equals fn's own name. */
function recursionIncrements(fn: Node): number {
  const name = functionName(fn);
  if (name === null) return 0;
  let total = 0;
  fn.forEachDescendant((node) => {
    if (!Node.isCallExpression(node)) return;
    const expr = node.getExpression();
    if (Node.isIdentifier(expr) && expr.getText() === name) total += 1;
  });
  return total;
}

/** Counts labeled break/continue inside fn (goto-like control flow). */
function labeledJumps(fn: Node): number {
  let total = 0;
  fn.forEachDescendant((node) => {
    if (Node.isBreakStatement(node) || Node.isContinueStatement(node)) {
      if (node.getLabel() !== undefined) total += 1;
    }
  });
  return total;
}

/**
 * Cognitive complexity of a function-like node per the SonarSource white paper (D4).
 * The function declaration itself adds no increment; scoring runs over its body.
 */
export function cognitiveComplexity(fn: Node): number {
  let total = 0;
  for (const child of fn.getChildren()) {
    total += walk(child, 0);
  }
  total += booleanSequences(fn);
  total += recursionIncrements(fn);
  total += labeledJumps(fn);
  return total;
}
