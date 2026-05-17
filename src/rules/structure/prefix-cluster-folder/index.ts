/**
 * @fileoverview prefix-cluster-folder rule — flags a directory where three or more
 * sibling files share a `<prefix>-` name, a hidden subsystem that wants its own folder.
 */
import type { Diagnostic } from '../../../types.js';
import { fileNodeIds } from '../../syntactic-support/find-source-file.js';
import type { GraphRule, GraphRuleContext } from '../../types.js';
import { baseNameOf, dirOf, isTestFile, stemOf } from '../support/file-paths.js';

/** Tunable options of the prefix-cluster-folder rule. */
interface Options {
  /** Minimum cluster size that triggers the rule. */
  readonly min: number;
}

const DEFAULTS: Options = { min: 3 };

/** The name prefix of a file — the stem up to its first '-'; null when it has none. */
function prefixOf(baseName: string): string | null {
  const stem = stemOf(baseName);
  const dash = stem.indexOf('-');
  return dash <= 0 ? null : stem.slice(0, dash);
}

/** Rule: 3+ sibling non-test files sharing a `<prefix>-` name form a foldable cluster. */
export const prefixClusterFolder: GraphRule = {
  id: 'prefix-cluster-folder',
  pack: 'structure',
  engine: 'graph',
  defaultSeverity: 'warning',
  check: (graph, _config, context: GraphRuleContext): Diagnostic[] => {
    const opts = { ...DEFAULTS, ...(context.options as Partial<Options>) };
    // directory → prefix → sibling file names sharing that prefix
    const clusters = new Map<string, Map<string, string[]>>();
    for (const fileId of fileNodeIds(graph)) {
      const base = baseNameOf(fileId);
      if (isTestFile(base)) continue;
      const prefix = prefixOf(base);
      if (prefix === null) continue;
      const dir = dirOf(fileId);
      let byPrefix = clusters.get(dir);
      if (byPrefix === undefined) {
        byPrefix = new Map();
        clusters.set(dir, byPrefix);
      }
      const names = byPrefix.get(prefix);
      if (names === undefined) byPrefix.set(prefix, [base]);
      else names.push(base);
    }
    const out: Diagnostic[] = [];
    for (const [dir, byPrefix] of clusters) {
      for (const [prefix, names] of byPrefix) {
        if (names.length < opts.min) continue;
        const sorted = [...names].sort();
        out.push({
          ruleId: context.ruleId,
          severity: context.severity,
          entity: dir,
          fingerprint: `prefix-cluster-folder#${dir}#${prefix}`,
          message: `${names.length} files in ${dir} share the "${prefix}-" prefix`,
          expected: `grouped into a ${prefix}/ subfolder`,
          actual: sorted.join(', '),
          reason:
            'files sharing a name prefix form a hidden subsystem that has no folder of its own',
          suggestions: [
            {
              action: 'custom',
              rationale: `create a ${prefix}/ subfolder, move the clustered files into it, and update imports`,
            },
          ],
          location: { file: dir, line: 1, column: 1 },
        });
      }
    }
    return out;
  },
};
