/**
 * @fileoverview subsystem-cohesion rule — flags a subsystem whose files rarely
 * reference each other. Files that sit together but never connect are a folder,
 * not a subsystem.
 */
import type { ResolvedConfig } from '../../../config/types.js';
import type { Diagnostic } from '../../../types.js';
import type { GraphRule, GraphRuleContext } from '../../types.js';
import { subsystemCoupling, subsystemOf } from '../support/subsystem-graph.js';

/** Tunable options of the subsystem-cohesion rule. */
interface Options {
  /** Lowest internal-cohesion ratio tolerated for a multi-file subsystem. */
  readonly min: number;
  /** Subsystem names exempt from the cohesion check. */
  readonly ignoreSubsystems: readonly string[];
}

const DEFAULTS: Options = { min: 0.3, ignoreSubsystems: [] };

/** Rule: a multi-file subsystem whose internal cohesion drops below `min` is flagged. */
export const subsystemCohesion: GraphRule = {
  id: 'subsystem-cohesion',
  pack: 'metrics',
  engine: 'graph',
  defaultSeverity: 'warning',
  check: (graph, config: ResolvedConfig, context: GraphRuleContext): Diagnostic[] => {
    const opts = { ...DEFAULTS, ...(context.options as Partial<Options>) };
    const root = config.project.sourceRoot;
    const ignore = new Set(opts.ignoreSubsystems);
    const coupling = subsystemCoupling(graph, root);

    // Files that import at least one sibling in their own subsystem.
    const filesWithSibling = new Set<string>();
    for (const edge of graph.edges) {
      if (edge.consumer === edge.producer) continue;
      if (subsystemOf(edge.consumer, root) === subsystemOf(edge.producer, root)) {
        filesWithSibling.add(edge.consumer);
      }
    }

    const out: Diagnostic[] = [];
    for (const [subsystem, info] of coupling) {
      const total = info.files.size;
      if (total < 2 || ignore.has(subsystem)) continue;
      let internal = 0;
      for (const file of info.files) {
        if (filesWithSibling.has(file)) internal += 1;
      }
      const cohesion = internal / total;
      if (cohesion >= opts.min) continue;
      out.push({
        ruleId: 'subsystem-cohesion',
        severity: context.severity,
        entity: `${root}/${subsystem}`,
        fingerprint: `subsystem-cohesion#${subsystem}`,
        message: `subsystem ${subsystem} has low internal cohesion`,
        expected: `cohesion ≥ ${opts.min}`,
        actual: `${cohesion.toFixed(2)} (${internal}/${total} files import a sibling)`,
        reason:
          'files that sit together but never reference each other are a folder, not a subsystem',
        suggestions: [
          {
            action: 'custom',
            rationale:
              'either the files belong in different subsystems, or a missing seam should connect them',
          },
        ],
        location: { file: `${root}/${subsystem}`, line: 1, column: 1 },
      });
    }
    return out;
  },
};
