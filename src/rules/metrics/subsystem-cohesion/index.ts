/**
 * @fileoverview subsystem-cohesion rule — flags a subsystem whose entity files
 * rarely reference each other. Files that sit together but never connect are a
 * folder, not a subsystem. Only entity files count — barrels and entry files are
 * connective tissue, not members of the subsystem's vocabulary.
 */

import type { ResolvedConfig } from '#config/types.js';
import { analyzeMetrics } from '#rules/metrics/analyze.js';
import { verdictToDiagnostic } from '#rules/metrics/verdict-to-diagnostic.js';
import type { GraphRule, GraphRuleContext } from '#rules/types.js';
import type { Diagnostic } from '#types.js';

/** Tunable options of the subsystem-cohesion rule. */
interface Options {
  /** Lowest internal-cohesion ratio tolerated for a multi-file subsystem. */
  readonly min: number;
  /** Subsystem names exempt from the cohesion check. */
  readonly ignoreSubsystems: readonly string[];
}

const DEFAULTS: Options = { min: 0.3, ignoreSubsystems: [] };

/** Rule: a subsystem whose entity-file internal cohesion drops below `min` is flagged. */
export const subsystemCohesion: GraphRule = {
  id: 'subsystem-cohesion',
  pack: 'metrics',
  engine: 'graph',
  defaultSeverity: 'warning',
  check: (graph, config: ResolvedConfig, context: GraphRuleContext): Diagnostic[] => {
    const opts = { ...DEFAULTS, ...(context.options as Partial<Options>) };
    const root = config.project.sourceRoot;
    const ignore = new Set(opts.ignoreSubsystems);
    const report = analyzeMetrics(graph, config);

    const out: Diagnostic[] = [];
    for (const [subsystem, m] of report) {
      if (m.entityFiles < 2 || ignore.has(subsystem)) continue;
      const cohesion = m.cohesiveEntityFiles / m.entityFiles;
      if (cohesion >= opts.min) continue;
      out.push(
        verdictToDiagnostic(
          {
            ruleId: 'subsystem-cohesion',
            entity: `${root}/${subsystem}`,
            fingerprint: `subsystem-cohesion#${subsystem}`,
            message: `subsystem ${subsystem} has low internal cohesion`,
            expected: `cohesion ≥ ${opts.min}`,
            actual: `${cohesion.toFixed(2)} (${m.cohesiveEntityFiles}/${m.entityFiles} files import a sibling)`,
            reason:
              'files that sit together but never reference each other are a folder, not a subsystem',
            suggestion:
              'either the files belong in different subsystems, or a missing seam should connect them',
          },
          context.severity,
        ),
      );
    }
    return out;
  },
};
