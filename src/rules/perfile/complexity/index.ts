/**
 * @fileoverview complexity rule — caps the cognitive complexity of a function (the
 * SonarSource metric, D4). Reads file AST from the RuleContext project (decision D9).
 */
import type { Diagnostic, Rule, RuleContext } from '../../../types.js';
import { scanFunctions, functionLocation } from '../support/scan-functions.js';
import { cognitiveComplexity } from '../support/complexity-metric.js';

/** Options of complexity. */
interface Options {
  readonly max: number;
}

const DEFAULTS: Options = { max: 15 };

/** Rule: a function's cognitive complexity must not exceed `max` (§13.1, D4). */
export const complexity: Rule = {
  id: 'complexity',
  pack: 'perfile',
  engine: 'perfile',
  defaultSeverity: 'warning',
  check: (graph, _config, context: RuleContext): Diagnostic[] => {
    const opts = { ...DEFAULTS, ...(context.options as Partial<Options>) };
    const out: Diagnostic[] = [];
    scanFunctions(graph, context.project, (fileId, unit) => {
      const value = cognitiveComplexity(unit.node);
      if (value <= opts.max) return;
      out.push({
        ruleId: context.ruleId,
        severity: context.severity,
        entity: fileId,
        fingerprint: `${fileId}#${unit.qualifiedPath}`,
        message: `the function's cognitive complexity exceeds ${opts.max}`,
        expected: `≤ ${opts.max}`,
        actual: `complexity ${value}`,
        reason: 'high cognitive complexity — the function is due for decomposition',
        suggestions: [
          { action: 'split', rationale: 'simplify the branching or extract sub-functions' },
        ],
        location: functionLocation(fileId, unit),
      });
    });
    return out;
  },
};
