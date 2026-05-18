/**
 * @fileoverview afferent-coupling rule — flags a subsystem that many other subsystems
 * depend on. A widely-depended-on subsystem is a high-blast-radius change point.
 */
import type { ResolvedConfig } from '#foundation/config/types.js';
import type { Diagnostic } from '#foundation/types/index.js';
import type { GraphRule, GraphRuleContext } from '#platform/engine/types.js';
import { analyzeMetrics } from '#rules/metrics/analyze.js';
import { verdictToDiagnostic } from '#rules/metrics/verdict-to-diagnostic.js';

/** Tunable options of the afferent-coupling rule. */
interface Options {
  /** Maximum tolerated inbound subsystem dependencies. */
  readonly max: number;
}

const DEFAULTS: Options = { max: 6 };

/** Rule: a subsystem with Ca above `max` inbound subsystem dependencies is flagged. */
export const afferentCoupling: GraphRule = {
  id: 'afferent-coupling',
  pack: 'metrics',
  engine: 'graph',
  defaultSeverity: 'info',
  check: (graph, config: ResolvedConfig, context: GraphRuleContext): Diagnostic[] => {
    const opts = { ...DEFAULTS, ...(context.options as Partial<Options>) };
    const root = config.project.sourceRoot;
    const report = analyzeMetrics(graph, config);
    const out: Diagnostic[] = [];
    for (const [subsystem, m] of report) {
      if (m.ca <= opts.max) continue;
      const inbound = [...m.inboundSubsystems].sort().join(', ');
      out.push(
        verdictToDiagnostic(
          {
            ruleId: 'afferent-coupling',
            entity: `${root}/${subsystem}`,
            fingerprint: `afferent-coupling#${subsystem}`,
            message: `subsystem ${subsystem} is depended on by many subsystems`,
            expected: `≤ ${opts.max} inbound subsystem dependencies`,
            actual: `${m.ca} (${inbound})`,
            reason:
              'a widely-depended-on subsystem is a high-blast-radius change point — keep its surface stable and small',
            suggestion: 'confirm this is a deliberate shared subsystem; if not, split it by client',
          },
          context.severity,
        ),
      );
    }
    return out;
  },
};
