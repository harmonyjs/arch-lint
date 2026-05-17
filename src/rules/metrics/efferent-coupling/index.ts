/**
 * @fileoverview efferent-coupling rule — flags a subsystem that depends on too many
 * other subsystems. High efferent coupling makes a subsystem hard to extract.
 */
import type { ResolvedConfig } from '../../../config/types.js';
import type { Diagnostic } from '../../../types.js';
import type { GraphRule, GraphRuleContext } from '../../types.js';
import { subsystemCoupling } from '../support/subsystem-graph.js';

/** Tunable options of the efferent-coupling rule. */
interface Options {
  /** Maximum tolerated outbound subsystem dependencies. */
  readonly max: number;
}

const DEFAULTS: Options = { max: 4 };

/** Rule: a subsystem with Ce above `max` outbound subsystem dependencies is flagged. */
export const efferentCoupling: GraphRule = {
  id: 'efferent-coupling',
  pack: 'metrics',
  engine: 'graph',
  defaultSeverity: 'warning',
  check: (graph, config: ResolvedConfig, context: GraphRuleContext): Diagnostic[] => {
    const opts = { ...DEFAULTS, ...(context.options as Partial<Options>) };
    const root = config.project.sourceRoot;
    const coupling = subsystemCoupling(graph, root);
    const out: Diagnostic[] = [];
    for (const [subsystem, info] of coupling) {
      if (info.ce <= opts.max) continue;
      const outbound = [...info.outboundSubsystems].sort().join(', ');
      out.push({
        ruleId: 'efferent-coupling',
        severity: context.severity,
        entity: `${root}/${subsystem}`,
        fingerprint: `efferent-coupling#${subsystem}`,
        message: `subsystem ${subsystem} depends on too many other subsystems`,
        expected: `≤ ${opts.max} outbound subsystem dependencies`,
        actual: `${info.ce} (${outbound})`,
        reason:
          'high efferent coupling makes the subsystem hard to extract and reason about in isolation',
        suggestions: [
          {
            action: 'custom',
            rationale: 'reduce the dependency fan-out — invert a dependency or merge a leaf',
          },
        ],
        location: { file: `${root}/${subsystem}`, line: 1, column: 1 },
      });
    }
    return out;
  },
};
