/**
 * @fileoverview max-lines-per-function rule — caps the line count of a single function.
 * Reads file AST from the RuleContext project (decision D9).
 */
import type { Diagnostic, Rule, RuleContext } from '../../../types.js';
import { functionLocation, scanFunctions } from '../support/scan-functions.js';

/** Options of max-lines-per-function. */
interface Options {
  readonly max: number;
}

const DEFAULTS: Options = { max: 60 };

/** Rule: a single function's line count must not exceed `max` (§13.1). */
export const maxLinesPerFunction: Rule = {
  id: 'max-lines-per-function',
  pack: 'perfile',
  engine: 'perfile',
  defaultSeverity: 'warning',
  check: (graph, _config, context: RuleContext): Diagnostic[] => {
    const opts = { ...DEFAULTS, ...(context.options as Partial<Options>) };
    const out: Diagnostic[] = [];
    scanFunctions(graph, context.project, (fileId, unit) => {
      const lines = unit.node.getEndLineNumber() - unit.node.getStartLineNumber() + 1;
      if (lines <= opts.max) return;
      out.push({
        ruleId: context.ruleId,
        severity: context.severity,
        entity: fileId,
        fingerprint: `${fileId}#${unit.qualifiedPath}`,
        message: `the function is longer than ${opts.max} lines`,
        expected: `≤ ${opts.max} lines`,
        actual: `${lines} lines`,
        reason: 'a long function reads poorly — time to decompose it',
        suggestions: [
          { action: 'split', rationale: 'extract part of the body into another function' },
        ],
        location: functionLocation(fileId, unit),
      });
    });
    return out;
  },
};
