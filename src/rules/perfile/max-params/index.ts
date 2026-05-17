/**
 * @fileoverview max-params rule — caps the total parameter count of a function.
 * Reads file AST from the RuleContext project (decision D9).
 */
import { Node } from 'ts-morph';
import type { Diagnostic } from '../../../types.js';
import type { Rule, RuleContext } from '../../types.js';
import { functionLocation, scanFunctions } from '../support/scan-functions.js';

/** Options of max-params. */
interface Options {
  readonly max: number;
}

const DEFAULTS: Options = { max: 4 };

/** Rule: a function's total parameter count must not exceed `max` (§13.1). */
export const maxParams: Rule = {
  id: 'max-params',
  pack: 'perfile',
  engine: 'perfile',
  defaultSeverity: 'warning',
  check: (graph, _config, context: RuleContext): Diagnostic[] => {
    const opts = { ...DEFAULTS, ...(context.options as Partial<Options>) };
    const out: Diagnostic[] = [];
    scanFunctions(graph, context.project, (fileId, unit) => {
      if (!Node.isParametered(unit.node)) return;
      const count = unit.node.getParameters().length;
      if (count <= opts.max) return;
      out.push({
        ruleId: context.ruleId,
        severity: context.severity,
        entity: fileId,
        fingerprint: `${fileId}#${unit.qualifiedPath}`,
        message: `the function takes more than ${opts.max} parameters`,
        expected: `≤ ${opts.max} parameters`,
        actual: `${count} parameters`,
        reason: 'many parameters signal a signature due for a rework',
        suggestions: [
          { action: 'custom', rationale: 'group the parameters into one options object' },
        ],
        location: functionLocation(fileId, unit),
      });
    });
    return out;
  },
};
