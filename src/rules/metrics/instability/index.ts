/**
 * @fileoverview instability rule — flags a unit declared a leaf yet measured
 * unstable. Instability I = Ce/(Ca+Ce); a foundational unit should be stable.
 */
import type { ResolvedConfig } from '#foundation/config/types.js';
import type { Diagnostic } from '#foundation/types/index.js';
import type { GraphRule, GraphRuleContext } from '#platform/engine/types.js';
import { analyzeMetrics, hasDeclaredUnits } from '#rules/metrics/analyze.js';
import { verdictToDiagnostic } from '#rules/metrics/verdict-to-diagnostic.js';

/** Tunable options of the instability rule. */
interface Options {
  /** Highest instability tolerated for a unit declared a leaf. */
  readonly maxForLeafUnits: number;
  /** Unit names asserted to be foundational leaves. */
  readonly leafUnits: readonly string[];
}

const DEFAULTS: Options = { maxForLeafUnits: 0.5, leafUnits: [] };

/** Rule: a unit named in `leafUnits` whose instability exceeds the max is flagged. */
export const instability: GraphRule = {
  id: 'instability',
  pack: 'metrics',
  engine: 'graph',
  defaultSeverity: 'info',
  check: (graph, config: ResolvedConfig, context: GraphRuleContext): Diagnostic[] => {
    const opts = { ...DEFAULTS, ...(context.options as Partial<Options>) };
    if (!hasDeclaredUnits(config) || opts.leafUnits.length === 0) return [];
    const report = analyzeMetrics(graph, config);
    const out: Diagnostic[] = [];
    for (const unit of opts.leafUnits) {
      const m = report.get(unit);
      if (m === undefined) continue;
      if (m.ca === 0) {
        // Emitted as info regardless of context.severity: Ca = 0 is a
        // degenerate boundary, not a real instability signal to escalate.
        out.push(
          verdictToDiagnostic(
            {
              ruleId: 'instability',
              entity: unit,
              fingerprint: `instability#${unit}`,
              message: `leaf unit ${unit} has no inbound dependencies`,
              expected: 'a foundational leaf is depended on by other units',
              actual: 'Ca = 0 — nothing imports this unit',
              reason:
                'a unit nothing depends on is not a foundation; its instability is a boundary artifact, not a signal',
              suggestion: 'drop it from leafUnits, or wire the units that should depend on it',
            },
            'info',
          ),
        );
        continue;
      }
      if (m.instability <= opts.maxForLeafUnits) continue;
      out.push(
        verdictToDiagnostic(
          {
            ruleId: 'instability',
            entity: unit,
            fingerprint: `instability#${unit}`,
            message: `unit ${unit} is declared a leaf but is unstable`,
            expected: `instability I ≤ ${opts.maxForLeafUnits}`,
            actual: `I = ${m.instability.toFixed(2)} (Ca=${m.ca}, Ce=${m.ce})`,
            reason: 'a foundational unit should be stable — many depend on it, it depends on few',
            suggestion:
              'move the outbound dependencies out of this unit, or drop it from leafUnits',
          },
          context.severity,
        ),
      );
    }
    return out;
  },
};
