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
  /** Subsystem names exempt from the check — high fan-out is correct by role. */
  readonly allow: readonly string[];
  /**
   * Foundational subsystems whose inbound dependency is not counted as efferent
   * coupling. A maximally-stable shared lexicon — the error taxonomy, say — carries
   * no logic to extract alongside, so depending on it does not raise extraction cost.
   */
  readonly foundational: readonly string[];
}

const DEFAULTS: Options = { max: 4, allow: [], foundational: [] };

/** Rule: a subsystem with Ce above `max` outbound subsystem dependencies is flagged. */
export const efferentCoupling: GraphRule = {
  id: 'efferent-coupling',
  pack: 'metrics',
  engine: 'graph',
  defaultSeverity: 'warning',
  check: (graph, config: ResolvedConfig, context: GraphRuleContext): Diagnostic[] => {
    const opts = { ...DEFAULTS, ...(context.options as Partial<Options>) };
    const root = config.project.sourceRoot;
    const allow = new Set(opts.allow);
    const foundational = new Set(opts.foundational);
    const coupling = subsystemCoupling(graph, root);
    const out: Diagnostic[] = [];
    for (const [subsystem, info] of coupling) {
      if (allow.has(subsystem)) continue;
      const deps = [...info.outboundSubsystems].filter((s) => !foundational.has(s)).sort();
      if (deps.length <= opts.max) continue;
      out.push({
        ruleId: 'efferent-coupling',
        severity: context.severity,
        entity: `${root}/${subsystem}`,
        fingerprint: `efferent-coupling#${subsystem}`,
        message: `subsystem ${subsystem} depends on too many other subsystems`,
        expected: `≤ ${opts.max} outbound subsystem dependencies`,
        actual: `${deps.length} (${deps.join(', ')})`,
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
