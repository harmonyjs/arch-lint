/**
 * @fileoverview prefix-cluster-folder rule — flags a directory where three or more
 * sibling files share a `<prefix>-` name, a hidden subsystem that wants its own folder.
 */
import { baseNameOf, dirOf, stemOf } from '#entity-id/index.js';
import type { ConsumerGraph } from '#graph/types.js';
import { isTestFile } from '#rules/structure/support/test-file.js';
import { fileNodeIds } from '#rules/syntactic-support/find-source-file.js';
import type { GraphRule, GraphRuleContext } from '#rules/types.js';
import type { Diagnostic } from '#types.js';

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

/** Groups every directory's direct non-test files by their name prefix. */
function collectClusters(graph: ConsumerGraph): Map<string, Map<string, string[]>> {
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
  return clusters;
}

/** Builds the diagnostic for one prefix cluster in `dir`. */
function clusterDiagnostic(
  dir: string,
  prefix: string,
  names: readonly string[],
  context: GraphRuleContext,
): Diagnostic {
  const sorted = [...names].sort();
  return {
    ruleId: context.ruleId,
    severity: context.severity,
    entity: dir,
    fingerprint: `prefix-cluster-folder#${dir}#${prefix}`,
    message: `${names.length} files in ${dir} share the "${prefix}-" prefix`,
    expected: `grouped into a ${prefix}/ subfolder`,
    actual: sorted.join(', '),
    reason: 'files sharing a name prefix form a hidden subsystem that has no folder of its own',
    suggestions: [
      {
        action: 'custom',
        rationale: `create a ${prefix}/ subfolder, move the clustered files into it, and update imports`,
      },
    ],
    location: { file: dir, line: 1, column: 1 },
  };
}

/** Rule: 3+ sibling non-test files sharing a `<prefix>-` name form a foldable cluster. */
export const prefixClusterFolder: GraphRule = {
  id: 'prefix-cluster-folder',
  pack: 'structure',
  engine: 'graph',
  defaultSeverity: 'warning',
  check: (graph, _config, context: GraphRuleContext): Diagnostic[] => {
    const opts = { ...DEFAULTS, ...(context.options as Partial<Options>) };
    const out: Diagnostic[] = [];
    for (const [dir, byPrefix] of collectClusters(graph)) {
      for (const [prefix, names] of byPrefix) {
        if (names.length >= opts.min) {
          out.push(clusterDiagnostic(dir, prefix, names, context));
        }
      }
    }
    return out;
  },
};
