/**
 * @fileoverview max-optional-params rule — caps the count of optional and default
 * parameters of a function (options-creep). Reads file AST from the RuleContext project (D9).
 */
import { Node } from 'ts-morph';
import type { Diagnostic, Rule, RuleContext } from '../../../types.js';
import { scanFunctions, functionLocation } from '../support/scan-functions.js';

/** Options of max-optional-params. */
interface Options {
  readonly max: number;
}

const DEFAULTS: Options = { max: 3 };

/** Rule: a function's optional/default parameter count must not exceed `max` (§13.1). */
export const maxOptionalParams: Rule = {
  id: 'max-optional-params',
  pack: 'perfile',
  engine: 'perfile',
  defaultSeverity: 'warning',
  check: (graph, _config, context: RuleContext): Diagnostic[] => {
    const opts = { ...DEFAULTS, ...(context.options as Partial<Options>) };
    const out: Diagnostic[] = [];
    scanFunctions(graph, context.project, (fileId, unit) => {
      if (!Node.isParametered(unit.node)) return;
      const count = unit.node
        .getParameters()
        .filter((p) => p.hasQuestionToken() || p.hasInitializer()).length;
      if (count <= opts.max) return;
      out.push({
        ruleId: context.ruleId,
        severity: context.severity,
        entity: fileId,
        fingerprint: `${fileId}#${unit.qualifiedPath}`,
        message: `the function takes more than ${opts.max} optional parameters`,
        expected: `≤ ${opts.max} optional parameters`,
        actual: `${count} optional parameters`,
        reason: 'options-creep — the function grows flags instead of a reworked signature',
        suggestions: [
          { action: 'custom', rationale: 'collect the optional flags into one options object' },
        ],
        location: functionLocation(fileId, unit),
      });
    });
    return out;
  },
};
