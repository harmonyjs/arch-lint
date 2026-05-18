/**
 * @fileoverview afferent-coupling rule — flags a unit that many other units
 * depend on. A widely-depended-on unit is a high-blast-radius change point.
 */
import type { ResolvedConfig } from '#foundation/config/types.js';
import type { Diagnostic } from '#foundation/types/index.js';
import type { GraphRule, GraphRuleContext } from '#platform/engine/types.js';
import { analyzeMetrics } from '#rules/metrics/analyze.js';
import { verdictToDiagnostic } from '#rules/metrics/verdict-to-diagnostic.js';

/** Tunable options of the afferent-coupling rule. */
interface Options {
  /** Maximum tolerated inbound unit dependencies. */
  readonly max: number;
}

const DEFAULTS: Options = { max: 6 };

/** Rule: a unit with Ca above `max` inbound unit dependencies is flagged. */
export const afferentCoupling: GraphRule = {
  id: 'afferent-coupling',
  pack: 'metrics',
  engine: 'graph',
  defaultSeverity: 'info',
  check: (graph, config: ResolvedConfig, context: GraphRuleContext): Diagnostic[] => {
    const opts = { ...DEFAULTS, ...(context.options as Partial<Options>) };
    if (Object.keys(config.units).length === 0) return [];
    const report = analyzeMetrics(graph, config);
    const out: Diagnostic[] = [];
    for (const [unit, m] of report) {
      if (m.ca <= opts.max) continue;
      const inbound = [...m.inboundUnits].sort().join(', ');
      out.push(
        verdictToDiagnostic(
          {
            ruleId: 'afferent-coupling',
            entity: unit,
            fingerprint: `afferent-coupling#${unit}`,
            message: `unit ${unit} is depended on by many units`,
            expected: `≤ ${opts.max} inbound unit dependencies`,
            actual: `${m.ca} (${inbound})`,
            reason:
              'a widely-depended-on unit is a high-blast-radius change point — keep its surface stable and small',
            suggestion: 'confirm this is a deliberate shared unit; if not, split it by client',
          },
          context.severity,
        ),
      );
    }
    return out;
  },
};
