/**
 * @fileoverview no-default-export rule — forbids `export default`; an entity is exported
 * only by name. Reads file AST from the RuleContext project (decision D9).
 */

import picomatch from 'picomatch';
import type { ExportDeclaration, ExportSpecifier, Statement } from 'ts-morph';
import { Node, type SourceFile } from 'ts-morph';
import { sourceFileFor } from '#foundation/ts-project/index.js';
import type { Diagnostic, Location } from '#foundation/types/index.js';
import { fileNodeIds } from '#platform/ast/file-nodes.js';
import type { SyntacticRule, SyntacticRuleContext } from '#platform/engine/types.js';

/** Options of no-default-export. */
interface Options {
  readonly exemptPaths: readonly string[];
}

/** Builds a 1-column location at the given node's start line. */
function locationOf(node: Statement | ExportSpecifier, fileId: string): Location {
  return { file: fileId, line: node.getStartLineNumber(), column: 1 };
}

/** A statement is a default export when it is `export default expr` or a `default`-flagged declaration. */
function isDefaultExportStatement(stmt: Statement): boolean {
  if (Node.isExportAssignment(stmt) && !stmt.isExportEquals()) return true;
  return Node.isExportable(stmt) && stmt.isDefaultExport();
}

/** Finds a `default`-named (or `as default`-aliased) specifier in a re-export, or null. */
function defaultSpecifierLocation(stmt: ExportDeclaration, fileId: string): Location | null {
  for (const spec of stmt.getNamedExports()) {
    const alias = spec.getAliasNode()?.getText();
    if (spec.getName() === 'default' || alias === 'default') {
      return locationOf(spec, fileId);
    }
  }
  return null;
}

/** Finds the position of a file's default export, or null. */
function defaultExportLocation(sf: SourceFile, fileId: string): Location | null {
  for (const stmt of sf.getStatements()) {
    if (isDefaultExportStatement(stmt)) {
      return locationOf(stmt, fileId);
    }
    if (Node.isExportDeclaration(stmt)) {
      const specLoc = defaultSpecifierLocation(stmt, fileId);
      if (specLoc !== null) return specLoc;
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
