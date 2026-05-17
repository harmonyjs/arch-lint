/**
 * @fileoverview cross-cutting-concern rule — flags a file pulled into many distinct
 * subsystems. Such a file is either shared lexicon or a leak; it should be named.
 */
import type { ResolvedConfig } from '../../../config/types.js';
import type { Diagnostic } from '../../../types.js';
import type { GraphRule, GraphRuleContext } from '../../types.js';
import { subsystemOf } from '../support/subsystem-graph.js';

/** Tunable options of the cross-cutting-concern rule. */
interface Options {
  /** Highest distinct-importing-subsystem count tolerated before a file is flagged. */
  readonly maxSubsystems: number;
  /** File ids exempt from the check — deliberate shared lexicon. */
  readonly allow: readonly string[];
}

const DEFAULTS: Options = { maxSubsystems: 5, allow: [] };

/** Rule: a file imported from `maxSubsystems` or more distinct other subsystems is flagged. */
export const crossCuttingConcern: GraphRule = {
  id: 'cross-cutting-concern',
  pack: 'metrics',
  engine: 'graph',
  defaultSeverity: 'info',
  check: (graph, config: ResolvedConfig, context: GraphRuleContext): Diagnostic[] => {
    const opts = { ...DEFAULTS, ...(context.options as Partial<Options>) };
    const root = config.project.sourceRoot;
    const allow = new Set(opts.allow);
    const out: Diagnostic[] = [];
    for (const node of graph.nodes.values()) {
      if (node.kind !== 'file' || allow.has(node.id)) continue;
      const ownSubsystem = subsystemOf(node.id, root);
      const importingSubsystems = new Set<string>();
      for (const edge of graph.consumersOf.get(node.id) ?? []) {
        const consumerSubsystem = subsystemOf(edge.consumer, root);
        if (consumerSubsystem !== ownSubsystem) importingSubsystems.add(consumerSubsystem);
      }
      if (importingSubsystems.size < opts.maxSubsystems) continue;
      const sorted = [...importingSubsystems].sort().join(', ');
      out.push({
        ruleId: 'cross-cutting-concern',
        severity: context.severity,
        entity: node.id,
        fingerprint: `cross-cutting-concern#${node.id}`,
        message: `${node.id} is imported across many subsystems`,
        expected: `imported from < ${opts.maxSubsystems} subsystems, or listed in metrics rule \`allow\``,
        actual: `${importingSubsystems.size} subsystems (${sorted})`,
        reason:
          'a file pulled into many subsystems is either shared lexicon or a leak — name it explicitly',
        suggestions: [
          {
            action: 'custom',
            rationale:
              'if this is intentional shared lexicon, add it to the rule allow list; otherwise narrow its consumers',
          },
        ],
        location: { file: node.id, line: 1, column: 1 },
      });
    }
    return out;
  },
};
