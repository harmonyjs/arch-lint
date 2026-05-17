/**
 * @fileoverview buildRuleContext — assembles the RuleContext passed to a rule's check function.
 */
import type { Project } from 'ts-morph';
import type { ResolvedConfig } from '../config/types.js';
import type { Rule, RuleContext } from './types.js';
import type { SuppressIndex } from '../suppress/types.js';
import type { ActiveSeverity } from '../types.js';
/**
 * Build the RuleContext for `rule`: effective severity, options with `severity`
 * stripped, the suppress index, and the parsed source project rules read AST from (D9).
 */
export function buildRuleContext(
  rule: Rule,
  config: ResolvedConfig,
  suppress: SuppressIndex,
  project: Project,
): RuleContext {
  const setting = config.rules[rule.id];
  const severity = (setting?.severity ?? rule.defaultSeverity) as ActiveSeverity;
  const options: Record<string, unknown> = {};
  if (setting !== undefined) {
    for (const [key, value] of Object.entries(setting)) {
      if (key !== 'severity') options[key] = value;
    }
  }
  return { ruleId: rule.id, severity, options, suppress, project };
}
