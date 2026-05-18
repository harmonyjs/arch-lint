/**
 * @fileoverview efferent-coupling rule — flags a subsystem that depends on too many
 * other subsystems. High efferent coupling makes a subsystem hard to extract.
 */
import type { ResolvedConfig } from '#config/types.js';
import { analyzeMetrics } from '#rules/metrics/analyze.js';
import { verdictToDiagnostic } from '#rules/metrics/verdict-to-diagnostic.js';
import type { GraphRule, GraphRuleContext } from '#rules/types.js';
import type { Diagnostic } from '#types.js';

/** Tunable options of the efferent-coupling rule. */
interface Options {
  /** Maximum tolerated outbound subsystem dependencies. */
  readonly max: number;
  /** Subsystem names exempt from the check — high fan-out is correct by role. */
  readonly allow: readonly string[];
}

const DEFAULTS: Options = { max: 4, allow: [] };

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
    const report = analyzeMetrics(graph, config);
    const out: Diagnostic[] = [];
    for (const [subsystem, m] of report) {
      if (allow.has(subsystem) || m.ce <= opts.max) continue;
      const outbound = [...m.outboundSubsystems].sort().join(', ');
      out.push(
        verdictToDiagnostic(
          {
            ruleId: 'efferent-coupling',
            entity: `${root}/${subsystem}`,
            fingerprint: `efferent-coupling#${subsystem}`,
            message: `subsystem ${subsystem} depends on too many other subsystems`,
            expected: `≤ ${opts.max} outbound subsystem dependencies`,
            actual: `${m.ce} (${outbound})`,
            reason:
              'high efferent coupling makes the subsystem hard to extract and reason about in isolation',
            suggestion: 'reduce the dependency fan-out — invert a dependency or merge a leaf',
          },
          context.severity,
        ),
      );
    }
    return out;
  },
};
