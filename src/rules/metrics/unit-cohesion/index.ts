/**
 * @fileoverview unit-cohesion rule — flags a unit whose entity files rarely
 * reference each other. Files that sit together but never connect are a folder,
 * not a unit. Only entity files count — barrels and entry files are connective
 * tissue, not members of the unit's vocabulary.
 */

import type { ResolvedConfig } from '#foundation/config/types.js';
import type { Diagnostic } from '#foundation/types/index.js';
import type { GraphRule, GraphRuleContext } from '#platform/engine/types.js';
import { analyzeMetrics, hasDeclaredUnits } from '#rules/metrics/analyze.js';
import { verdictToDiagnostic } from '#rules/metrics/verdict-to-diagnostic.js';

/** Tunable options of the unit-cohesion rule. */
interface Options {
  /** Lowest internal-cohesion ratio tolerated for a multi-file unit. */
  readonly min: number;
  /** Unit names exempt from the cohesion check. */
  readonly ignoreUnits: readonly string[];
}

const DEFAULTS: Options = { min: 0.3, ignoreUnits: [] };

/** Rule: a unit whose entity-file internal cohesion drops below `min` is flagged. */
export const unitCohesion: GraphRule = {
  id: 'unit-cohesion',
  pack: 'metrics',
  engine: 'graph',
  defaultSeverity: 'warning',
  check: (graph, config: ResolvedConfig, context: GraphRuleContext): Diagnostic[] => {
    const opts = { ...DEFAULTS, ...(context.options as Partial<Options>) };
    if (!hasDeclaredUnits(config)) return [];
    const ignore = new Set(opts.ignoreUnits);
    const report = analyzeMetrics(graph, config);
    const out: Diagnostic[] = [];
    for (const [unit, m] of report) {
      if (m.entityFiles < 2 || ignore.has(unit)) continue;
      const cohesion = m.cohesiveEntityFiles / m.entityFiles;
      if (cohesion >= opts.min) continue;
      out.push(
        verdictToDiagnostic(
          {
            ruleId: 'unit-cohesion',
            entity: unit,
            fingerprint: `unit-cohesion#${unit}`,
            message: `unit ${unit} has low internal cohesion`,
            expected: `cohesion ≥ ${opts.min}`,
            actual: `${cohesion.toFixed(2)} (${m.cohesiveEntityFiles}/${m.entityFiles} files import a sibling)`,
            reason:
              'files that sit together but never reference each other are a folder, not a unit',
            suggestion:
              'either the files belong in different units, or a missing seam should connect them',
          },
          context.severity,
        ),
      );
    }
    return out;
  },
};
