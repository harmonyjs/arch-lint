/**
 * @fileoverview instability rule — flags a subsystem declared a leaf yet measured
 * unstable. Instability I = Ce/(Ca+Ce); a foundational subsystem should be stable.
 */
import type { ResolvedConfig } from '#foundation/config/types.js';
import type { Diagnostic } from '#foundation/types/index.js';
import type { GraphRule, GraphRuleContext } from '#platform/engine/types.js';
import { analyzeMetrics } from '#rules/metrics/analyze.js';
import { verdictToDiagnostic } from '#rules/metrics/verdict-to-diagnostic.js';

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
    const report = analyzeMetrics(graph, config);
    const out: Diagnostic[] = [];
    for (const subsystem of opts.leafSubsystems) {
      const m = report.get(subsystem);
      if (m === undefined || m.instability <= opts.maxForLeafSubsystems) continue;
      out.push(
        verdictToDiagnostic(
          {
            ruleId: 'instability',
            entity: `${root}/${subsystem}`,
            fingerprint: `instability#${subsystem}`,
            message: `subsystem ${subsystem} is declared a leaf but is unstable`,
            expected: `instability I ≤ ${opts.maxForLeafSubsystems}`,
            actual: `I = ${m.instability.toFixed(2)} (Ca=${m.ca}, Ce=${m.ce})`,
            reason:
              'a foundational subsystem should be stable — many depend on it, it depends on few',
            suggestion:
              'move the outbound dependencies out of this subsystem, or drop it from leafSubsystems',
          },
          context.severity,
        ),
      );
    }
    return out;
  },
};
