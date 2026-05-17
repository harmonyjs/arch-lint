/**
 * @fileoverview instability rule — flags a subsystem declared a leaf yet measured
 * unstable. Instability I = Ce/(Ca+Ce); a foundational subsystem should be stable.
 */
import type { ResolvedConfig } from '../../../config/types.js';
import type { Diagnostic } from '../../../types.js';
import type { GraphRule, GraphRuleContext } from '../../types.js';
import { subsystemCoupling } from '../support/subsystem-graph.js';

/** Tunable options of the instability rule. */
interface Options {
  /** Highest instability tolerated for a subsystem declared a leaf. */
  readonly maxForLeafSubsystems: number;
  /** Subsystem names asserted to be foundational leaves. */
  readonly leafSubsystems: readonly string[];
}

const DEFAULTS: Options = { maxForLeafSubsystems: 0.5, leafSubsystems: [] };

/** Rule: a subsystem named in `leafSubsystems` whose instability exceeds the max is flagged. */
export const instability: GraphRule = {
  id: 'instability',
  pack: 'metrics',
  engine: 'graph',
  defaultSeverity: 'info',
  check: (graph, config: ResolvedConfig, context: GraphRuleContext): Diagnostic[] => {
    const opts = { ...DEFAULTS, ...(context.options as Partial<Options>) };
    if (opts.leafSubsystems.length === 0) return [];
    const root = config.project.sourceRoot;
    const coupling = subsystemCoupling(graph, root);
    const out: Diagnostic[] = [];
    for (const subsystem of opts.leafSubsystems) {
      const info = coupling.get(subsystem);
      if (info === undefined) continue;
      const total = info.ca + info.ce;
      const i = total === 0 ? 0 : info.ce / total;
      if (i <= opts.maxForLeafSubsystems) continue;
      out.push({
        ruleId: 'instability',
        severity: context.severity,
        entity: `${root}/${subsystem}`,
        fingerprint: `instability#${subsystem}`,
        message: `subsystem ${subsystem} is declared a leaf but is unstable`,
        expected: `instability I ≤ ${opts.maxForLeafSubsystems}`,
        actual: `I = ${i.toFixed(2)} (Ca=${info.ca}, Ce=${info.ce})`,
        reason: 'a foundational subsystem should be stable — many depend on it, it depends on few',
        suggestions: [
          {
            action: 'custom',
            rationale:
              'move the outbound dependencies out of this subsystem, or drop it from leafSubsystems',
          },
        ],
        location: { file: `${root}/${subsystem}`, line: 1, column: 1 },
      });
    }
    return out;
  },
};
