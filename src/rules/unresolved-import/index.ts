/**
 * @fileoverview unresolved-import rule — reports internal imports the resolver could not unwind.
 */
import type { Diagnostic, Rule } from '../../types.js';

/** Rule: every entry in graph.unresolved is a lost consumer edge worth reporting. */
export const unresolvedImportRule: Rule = {
  id: 'unresolved-import',
  pack: 'meta',
  engine: 'meta',
  defaultSeverity: 'warning',
  check: (graph, _config, context): Diagnostic[] => {
    const out: Diagnostic[] = [];
    const seen = new Set<string>();
    for (const u of graph.unresolved) {
      const fingerprint = `${u.file}#${u.specifier}#${u.symbol}`;
      if (seen.has(fingerprint)) continue;
      seen.add(fingerprint);
      out.push({
        ruleId: 'unresolved-import',
        severity: context.severity,
        entity: u.file,
        fingerprint,
        message: `${u.file} has an unresolved import of "${u.specifier}"`,
        actual: u.specifier,
        reason: `import could not be resolved (${u.reason})`,
        suggestions: [
          { action: 'custom', rationale: `fix or remove the import of "${u.specifier}"` },
        ],
        location: u.location,
      });
    }
    return out;
  },
};
