/**
 * @fileoverview afferent-coupling rule — flags a unit that many other units
 * depend on. A widely-depended-on unit is a high-blast-radius change point.
 */
import type { ResolvedConfig } from '#foundation/config/types.js';
import type { Diagnostic } from '#foundation/types/index.js';
import type { GraphRule, GraphRuleContext } from '#platform/engine/types.js';
import { couplingFacets, splitSuggestion } from '#rules/metrics/analysis/index.js';
import { analyzeMetrics, hasDeclaredUnits } from '#rules/metrics/analyze.js';
import { verdictToDiagnostic } from '#rules/metrics/verdict-to-diagnostic.js';

/** Tunable options of the afferent-coupling rule. */
interface Options {
  /** Maximum tolerated inbound unit dependencies. */
  readonly max: number;
  /** Unit names exempt from the check — high fan-in is correct by role. */
  readonly allow: readonly string[];
}

const DEFAULTS: Options = { max: 6, allow: [] };

/** Rule: a unit with Ca above `max` inbound unit dependencies is flagged. */
export const afferentCoupling: GraphRule = {
  id: 'afferent-coupling',
  pack: 'metrics',
  engine: 'graph',
  defaultSeverity: 'info',
  check: (graph, config: ResolvedConfig, context: GraphRuleContext): Diagnostic[] => {
    const opts = { ...DEFAULTS, ...(context.options as Partial<Options>) };
    if (!hasDeclaredUnits(config)) return [];
    const allow = new Set(opts.allow);
    const report = analyzeMetrics(graph, config);
    const out: Diagnostic[] = [];
    for (const [unit, m] of report) {
      if (allow.has(unit) || m.ca <= opts.max) continue;
      const analysis = couplingFacets(unit, graph, config, 'inbound');
      out.push(
        verdictToDiagnostic(
          {
            ruleId: 'afferent-coupling',
            entity: unit,
            fingerprint: `afferent-coupling#${unit}`,
            message: `unit ${unit} is depended on by many units`,
            expected: `≤ ${opts.max} inbound unit dependencies`,
            actual: `${m.ca}`,
            reason:
              'a widely-depended-on unit is a high-blast-radius change point — keep its surface stable and small',
            suggestions: [splitSuggestion(analysis, graph, config)],
            analysis,
          },
          context.severity,
        ),
      );
    }
    return out;
  },
};
