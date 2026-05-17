/**
 * @fileoverview Context builders — assemble the engine-specific context passed to a
 * rule's check function. Each builder resolves the effective severity and strips the
 * `severity` field from the rule's configured options.
 */
import type { Project } from 'ts-morph';
import type { ResolvedConfig } from '../../config/types.js';
import type { ConsumerGraph } from '../../graph/types.js';
import type { SuppressIndex } from '../../suppress/types.js';
import type { ActiveSeverity } from '../../types.js';
import { assertGraphProjectConsistent } from '../syntactic-support/index.js';
import type {
  GraphRuleContext,
  ManifestBundle,
  ManifestRuleContext,
  Rule,
  SyntacticRuleContext,
} from '../types.js';

/** Effective severity plus options with `severity` stripped — shared by every builder. */
function baseContext(
  rule: Rule,
  config: ResolvedConfig,
): { ruleId: string; severity: ActiveSeverity; options: Record<string, unknown> } {
  const setting = config.rules[rule.id];
  const severity = (setting?.severity ?? rule.defaultSeverity) as ActiveSeverity;
  const options: Record<string, unknown> = {};
  if (setting !== undefined) {
    for (const [key, value] of Object.entries(setting)) {
      if (key !== 'severity') options[key] = value;
    }
  }
  return { ruleId: rule.id, severity, options };
}

/** Build the GraphRuleContext for `rule`: severity, options, and the suppress index. */
export function buildGraphContext(
  rule: Rule,
  config: ResolvedConfig,
  suppress: SuppressIndex,
): GraphRuleContext {
  return { ...baseContext(rule, config), suppress };
}

/** Build the SyntacticRuleContext for `rule`: the GraphRule fields plus the parsed project. */
export function buildSyntacticContext(
  rule: Rule,
  config: ResolvedConfig,
  suppress: SuppressIndex,
  project: Project,
  graph: ConsumerGraph,
): SyntacticRuleContext {
  assertGraphProjectConsistent(graph, project);
  return { ...baseContext(rule, config), suppress, project };
}

/** Build the ManifestRuleContext for `rule`: severity, options, the manifest bundle and cwd. */
export function buildManifestContext(
  rule: Rule,
  config: ResolvedConfig,
  manifests: ManifestBundle,
  cwd: string,
): ManifestRuleContext {
  return { ...baseContext(rule, config), manifests, cwd };
}
