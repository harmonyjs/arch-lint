/**
 * @fileoverview no-wildcard-reexport rule — forbids `export *` and `export * as ns`
 * in barrels. Reads import/export AST from the RuleContext project (decision D9).
 */
import type { Diagnostic, Rule } from '../../types.js';
import { sourceFileFor, fileNodeIds } from '../syntactic-support/source-files.js';
import { importsOf, type ImportInfo } from '../syntactic-support/import-info.js';
import { dedupByFingerprint } from '../syntactic-support/dedup.js';

/** Builds the diagnostic for one forbidden wildcard re-export. */
function wildcardDiagnostic(
  fileId: string,
  imp: ImportInfo,
  ruleId: string,
  severity: Diagnostic['severity'],
): Diagnostic {
  const nsTag = imp.namespaceName ?? '*';
  const asClause = imp.namespaceName ? ` as ${imp.namespaceName}` : '';
  return {
    ruleId,
    severity,
    entity: fileId,
    fingerprint: `${fileId}#${imp.specifier}#${nsTag}`,
    message:
      imp.namespaceName === null
        ? `Wildcard re-export 'export * from "${imp.specifier}"' is forbidden`
        : `Namespace re-export 'export * as ${imp.namespaceName}' is forbidden`,
    actual: `export *${asClause} from '${imp.specifier}'`,
    reason: 'Wildcard re-exports break the syntactic resolver and widen the barrel surface',
    suggestions: [
      {
        action: 'custom',
        rationale: `Replace with explicit named re-exports: export { … } from '${imp.specifier}'`,
      },
    ],
    location: imp.location,
  };
}

/** Rule: both wildcard re-export forms are forbidden (§8.3). */
export const noWildcardReexport: Rule = {
  id: 'no-wildcard-reexport',
  pack: 'barrels',
  engine: 'syntactic',
  defaultSeverity: 'error',
  check: (graph, _config, context): Diagnostic[] => {
    const diagnostics: Diagnostic[] = [];
    for (const fileId of fileNodeIds(graph)) {
      const sf = sourceFileFor(context.project, fileId);
      if (sf === undefined) continue;
      for (const imp of importsOf(sf)) {
        if (imp.kind !== 'reexport' || !imp.wildcard) continue;
        diagnostics.push(wildcardDiagnostic(fileId, imp, context.ruleId, context.severity));
      }
    }
    return dedupByFingerprint(diagnostics);
  },
};
