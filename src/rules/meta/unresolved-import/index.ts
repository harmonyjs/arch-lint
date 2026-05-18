/**
 * @fileoverview unresolved-import rule — reports internal imports the resolver could not unwind.
 */

import type { Diagnostic } from '#foundation/types/index.js';
import type { GraphRule } from '#platform/engine/types.js';
/** Rule: every entry in graph.unresolved is a lost consumer edge worth reporting. */
export const unresolvedImportRule: GraphRule = {
  id: 'unresolved-import',
  pack: 'meta',
  engine: 'graph',
  defaultSeverity: 'warning',
  check: (graph, _config, context): Diagnostic[] => {
    const out: Diagnostic[] = [];
    const seen = new Set<string>();
    for (const u of graph.unresolved) {
      // Node builtins are always valid; this rule only reports internal imports.
      if (u.specifier.startsWith('node:')) continue;
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
