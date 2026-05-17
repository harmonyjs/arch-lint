/**
 * @fileoverview single-entity-per-file rule — forbids more than one exported entity
 * (class or component) per file. Reads file AST from the RuleContext project (D9).
 */

import type { SourceFile, VariableDeclaration } from 'ts-morph';
import { Node } from 'ts-morph';
import type { Diagnostic } from '../../../types.js';
import { fileNodeIds, sourceFileFor } from '../../syntactic-support/find-source-file.js';
import type { SyntacticRule, SyntacticRuleContext } from '../../types.js';

/** PascalCase name — the component heuristic (decision A2). */
function isPascalCase(name: string | undefined): boolean {
  return name !== undefined && /^[A-Z]/.test(name);
}

/** Counts exported classes — every exported class is an entity. */
function exportedClassCount(sf: SourceFile): number {
  return sf.getClasses().filter((cls) => cls.isExported()).length;
}

/** Counts exported PascalCase function declarations — the component heuristic. */
function exportedComponentFunctionCount(sf: SourceFile): number {
  return sf.getFunctions().filter((fn) => fn.isExported() && isPascalCase(fn.getName())).length;
}

/** A declaration is a component when it binds a PascalCase name to an arrow/function expression. */
function isComponentDeclaration(decl: VariableDeclaration): boolean {
  const init = decl.getInitializer();
  const isFn =
    init !== undefined && (Node.isArrowFunction(init) || Node.isFunctionExpression(init));
  return isFn && isPascalCase(decl.getName());
}

/** Counts exported PascalCase arrow/function consts across all exported variable statements. */
function exportedComponentConstCount(sf: SourceFile): number {
  let count = 0;
  for (const stmt of sf.getVariableStatements()) {
    if (!stmt.isExported()) continue;
    count += stmt.getDeclarations().filter(isComponentDeclaration).length;
  }
  return count;
}

/** Counts exported entities of a file: a class, or a PascalCase function/arrow const. */
function entityCount(sf: SourceFile): number {
  return (
    exportedClassCount(sf) + exportedComponentFunctionCount(sf) + exportedComponentConstCount(sf)
  );
}

/** Rule: at most one exported entity (class/component) per file (§13.1, A2). */
export const singleEntityPerFile: SyntacticRule = {
  id: 'single-entity-per-file',
  pack: 'perfile',
  engine: 'syntactic',
  defaultSeverity: 'error',
  check: (graph, _config, context: SyntacticRuleContext): Diagnostic[] => {
    const out: Diagnostic[] = [];
    for (const fileId of fileNodeIds(graph)) {
      const sf = sourceFileFor(context.project, fileId);
      if (sf === undefined) continue;
      const count = entityCount(sf);
      if (count <= 1) continue;
      const reason = `the file exports ${count} entities — one is allowed`;
      out.push({
        ruleId: context.ruleId,
        severity: context.severity,
        entity: fileId,
        fingerprint: fileId,
        message: 'a file may export at most one entity',
        actual: reason,
        reason,
        suggestions: [{ action: 'split', rationale: 'move each entity into its own file' }],
        location: { file: fileId, line: 1, column: 1 },
      });
    }
    return out;
  },
};
