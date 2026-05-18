/**
 * @fileoverview efferent-coupling rule — flags a unit that depends on too many
 * other units. High efferent coupling makes a unit hard to extract.
 */
import type { ResolvedConfig } from '#foundation/config/types.js';
import type { Diagnostic } from '#foundation/types/index.js';
import type { GraphRule, GraphRuleContext } from '#platform/engine/types.js';
import { analyzeMetrics, hasDeclaredUnits } from '#rules/metrics/analyze.js';
import { verdictToDiagnostic } from '#rules/metrics/verdict-to-diagnostic.js';

/** Tunable options of the efferent-coupling rule. */
interface Options {
  /** Maximum tolerated outbound unit dependencies. */
  readonly max: number;
  /** Unit names exempt from the check — high fan-out is correct by role. */
  readonly allow: readonly string[];
}

const DEFAULTS: Options = { max: 4, allow: [] };

/** Rule: a unit with Ce above `max` outbound unit dependencies is flagged. */
export const efferentCoupling: GraphRule = {
  id: 'efferent-coupling',
  pack: 'metrics',
  engine: 'graph',
  defaultSeverity: 'warning',
  check: (graph, config: ResolvedConfig, context: GraphRuleContext): Diagnostic[] => {
    const opts = { ...DEFAULTS, ...(context.options as Partial<Options>) };
    if (!hasDeclaredUnits(config)) return [];
    const allow = new Set(opts.allow);
    const report = analyzeMetrics(graph, config);
    const out: Diagnostic[] = [];
    for (const [unit, m] of report) {
      if (allow.has(unit) || m.ce <= opts.max) continue;
      const outbound = [...m.outboundUnits].sort().join(', ');
      out.push(
        verdictToDiagnostic(
          {
            ruleId: 'efferent-coupling',
            entity: unit,
            fingerprint: `efferent-coupling#${unit}`,
            message: `unit ${unit} depends on too many other units`,
            expected: `≤ ${opts.max} outbound unit dependencies`,
            actual: `${m.ce} (${outbound})`,
            reason:
              'high efferent coupling makes the unit hard to extract and reason about in isolation',
            suggestion: 'reduce the dependency fan-out — invert a dependency or merge a leaf',
          },
          context.severity,
        ),
      );
    }
    return out;
  },
};
