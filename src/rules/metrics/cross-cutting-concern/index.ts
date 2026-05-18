/**
 * @fileoverview cross-cutting-concern rule — flags a unit that is a god-module:
 * high afferent coupling AND high efferent coupling AND low internal cohesion
 * AND low abstractness. The four-signal conjunction separates a god-module from
 * a legitimate shared kernel (a types module trips Ca but not Ce/abstractness).
 */
import type { ResolvedConfig } from '#foundation/config/types.js';
import type { Diagnostic } from '#foundation/types/index.js';
import type { GraphRule, GraphRuleContext } from '#platform/engine/types.js';
import { analyzeMetrics } from '#rules/metrics/analyze.js';
import { verdictToDiagnostic } from '#rules/metrics/verdict-to-diagnostic.js';

/** Tunable options of the cross-cutting-concern rule. */
interface Options {
  /** Lowest afferent coupling (Ca) that counts as "high". */
  readonly minCa: number;
  /** Lowest efferent coupling (Ce) that counts as "high". */
  readonly minCe: number;
  /** Highest internal cohesion that counts as "low". */
  readonly maxCohesion: number;
  /** Highest abstractness that counts as "low" (concrete, not a contracts module). */
  readonly maxAbstractness: number;
  /** Unit names exempt from the check — deliberate shared kernels. */
  readonly allow: readonly string[];
}

const DEFAULTS: Options = {
  minCa: 5,
  minCe: 4,
  maxCohesion: 0.3,
  maxAbstractness: 0.5,
  allow: [],
};

/**
 * Rule: a unit is flagged when it trips all four signals at once — high Ca,
 * high Ce, low cohesion and low abstractness.
 */
export const crossCuttingConcern: GraphRule = {
  id: 'cross-cutting-concern',
  pack: 'metrics',
  engine: 'graph',
  defaultSeverity: 'info',
  check: (graph, config: ResolvedConfig, context: GraphRuleContext): Diagnostic[] => {
    const opts = { ...DEFAULTS, ...(context.options as Partial<Options>) };
    if (Object.keys(config.units).length === 0) return [];
    const allow = new Set(opts.allow);
    const report = analyzeMetrics(graph, config);
    const out: Diagnostic[] = [];
    for (const [unit, m] of report) {
      if (allow.has(unit)) continue;
      const cohesion = m.entityFiles === 0 ? 1 : m.cohesiveEntityFiles / m.entityFiles;
      if (m.ca < opts.minCa) continue;
      if (m.ce < opts.minCe) continue;
      if (cohesion > opts.maxCohesion) continue;
      if (m.abstractness > opts.maxAbstractness) continue;
      out.push(
        verdictToDiagnostic(
          {
            ruleId: 'cross-cutting-concern',
            entity: unit,
            fingerprint: `cross-cutting-concern#${unit}`,
            message: `unit ${unit} is a cross-cutting concern`,
            expected:
              `not all of: Ca ≥ ${opts.minCa}, Ce ≥ ${opts.minCe}, ` +
              `cohesion ≤ ${opts.maxCohesion}, abstractness ≤ ${opts.maxAbstractness}` +
              ', or listed in the rule `allow`',
            actual:
              `Ca=${m.ca}, Ce=${m.ce}, cohesion=${cohesion.toFixed(2)}, ` +
              `abstractness=${m.abstractness.toFixed(2)}`,
            reason:
              'a unit that is widely depended on, depends widely, is internally incoherent and concrete is a god-module — not a shared kernel',
            suggestion:
              'split the unit by responsibility, or — if it is a deliberate shared kernel — add it to the rule allow list',
          },
          context.severity,
        ),
      );
    }
    return out;
  },
};
