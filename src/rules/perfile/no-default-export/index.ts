/**
 * @fileoverview no-default-export rule — forbids `export default`; an entity is exported
 * only by name. Reads file AST from the RuleContext project (decision D9).
 */

import picomatch from 'picomatch';
import type { SourceFile } from 'ts-morph';
import { Node } from 'ts-morph';
import type { Diagnostic, Location } from '../../../types.js';
import { fileNodeIds, sourceFileFor } from '../../syntactic-support/source-files.js';
import type { SyntacticRule, SyntacticRuleContext } from '../../types.js';

/** Options of no-default-export. */
interface Options {
  readonly exemptPaths: readonly string[];
}

/** Finds the position of a file's default export, or null. */
function defaultExportLocation(sf: SourceFile, fileId: string): Location | null {
  for (const stmt of sf.getStatements()) {
    if (Node.isExportAssignment(stmt) && !stmt.isExportEquals()) {
      return { file: fileId, line: stmt.getStartLineNumber(), column: 1 };
    }
    if (Node.isExportable(stmt) && stmt.isDefaultExport()) {
      return { file: fileId, line: stmt.getStartLineNumber(), column: 1 };
    }
    if (Node.isExportDeclaration(stmt)) {
      for (const spec of stmt.getNamedExports()) {
        const alias = spec.getAliasNode()?.getText();
        if (spec.getName() === 'default' || alias === 'default') {
          return { file: fileId, line: spec.getStartLineNumber(), column: 1 };
        }
      }
    }
  }
  return null;
}

/** Rule: `export default` is forbidden in both forms (§13.1). */
export const noDefaultExport: SyntacticRule = {
  id: 'no-default-export',
  pack: 'perfile',
  engine: 'syntactic',
  defaultSeverity: 'error',
  check: (graph, _config, context: SyntacticRuleContext): Diagnostic[] => {
    const { exemptPaths } = {
      exemptPaths: [] as readonly string[],
      ...(context.options as Partial<Options>),
    };
    const isExempt = picomatch([...exemptPaths]);
    const out: Diagnostic[] = [];
    for (const fileId of fileNodeIds(graph)) {
      if (exemptPaths.length > 0 && isExempt(fileId)) continue;
      const sf = sourceFileFor(context.project, fileId);
      if (sf === undefined) continue;
      const loc = defaultExportLocation(sf, fileId);
      if (loc === null) continue;
      out.push({
        ruleId: context.ruleId,
        severity: context.severity,
        entity: fileId,
        fingerprint: fileId,
        message: 'a default export is forbidden — export the entity by name',
        actual: 'the file contains an export default',
        reason: 'a default export has no canonical name — importers name the entity freely',
        suggestions: [
          { action: 'custom', rationale: 'replace the export default with a named export' },
        ],
        location: loc,
      });
    }
    return out;
  },
};
