/**
 * @fileoverview single-entity-per-file rule — forbids more than one exported entity
 * (class or component) per file. Reads file AST from the RuleContext project (D9).
 */
import { Node } from 'ts-morph';
import type { SourceFile } from 'ts-morph';
import type { Diagnostic, Rule, RuleContext } from '../../../types.js';
import { fileNodeIds, sourceFileFor } from '../../syntactic-support/source-files.js';

/** PascalCase name — the component heuristic (decision A2). */
function isPascalCase(name: string | undefined): boolean {
  return name !== undefined && /^[A-Z]/.test(name);
}

/** Counts exported entities of a file: a class, or a PascalCase function/arrow const. */
function entityCount(sf: SourceFile): number {
  let count = 0;
  for (const cls of sf.getClasses()) {
    if (cls.isExported()) count += 1;
  }
  for (const fn of sf.getFunctions()) {
    if (fn.isExported() && isPascalCase(fn.getName())) count += 1;
  }
  for (const stmt of sf.getVariableStatements()) {
    if (!stmt.isExported()) continue;
    for (const decl of stmt.getDeclarations()) {
      const init = decl.getInitializer();
      const isFn = init !== undefined && (Node.isArrowFunction(init) || Node.isFunctionExpression(init));
      if (isFn && isPascalCase(decl.getName())) count += 1;
    }
  }
  return count;
}

/** Rule: at most one exported entity (class/component) per file (§13.1, A2). */
export const singleEntityPerFile: Rule = {
  id: 'single-entity-per-file',
  pack: 'perfile',
  engine: 'perfile',
  defaultSeverity: 'error',
  check: (graph, _config, context: RuleContext): Diagnostic[] => {
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
