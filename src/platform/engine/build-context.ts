/**
 * @fileoverview Context builders — assemble the engine-specific context passed to a
 * rule's check function. Each builder resolves the effective severity and strips the
 * `severity` field from the rule's configured options.
 */
import type { Project } from 'ts-morph';
import type { ResolvedConfig } from '#foundation/config/types.js';
import type { Logger } from '#foundation/logger/index.js';
import type { SuppressIndex } from '#foundation/suppress/types.js';
import type { ActiveSeverity } from '#foundation/types/index.js';
import type {
  CensusRuleContext,
  GraphRuleContext,
  ManifestBundle,
  ManifestRuleContext,
  Rule,
  SyntacticRuleContext,
} from '#platform/engine/types.js';

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

/** The engine-specific dependencies a GraphRuleContext is assembled from. */
export interface GraphContextDeps {
  readonly suppress: SuppressIndex;
  readonly logger: Logger;
}

/** The engine-specific dependencies a SyntacticRuleContext is assembled from. */
export interface SyntacticContextDeps extends GraphContextDeps {
  readonly project: Project;
}

/** The engine-specific dependencies a ManifestRuleContext is assembled from. */
export interface ManifestContextDeps {
  readonly manifests: ManifestBundle;
  readonly cwd: string;
  readonly logger: Logger;
}

/** The engine-specific dependencies a CensusRuleContext is assembled from. */
export interface CensusContextDeps {
  readonly census: readonly string[];
  readonly logger: Logger;
}

/** Build the GraphRuleContext for `rule`: severity, options, the suppress index and logger. */
export function buildGraphContext(
  rule: Rule,
  config: ResolvedConfig,
  deps: GraphContextDeps,
): GraphRuleContext {
  return { ...baseContext(rule, config), suppress: deps.suppress, logger: deps.logger };
}

/** Build the SyntacticRuleContext for `rule`: the GraphRule fields plus the parsed project. */
export function buildSyntacticContext(
  rule: Rule,
  config: ResolvedConfig,
  deps: SyntacticContextDeps,
): SyntacticRuleContext {
  return {
    ...baseContext(rule, config),
    suppress: deps.suppress,
    project: deps.project,
    logger: deps.logger,
  };
}

/** Build the ManifestRuleContext for `rule`: severity, options, the manifest bundle and cwd. */
export function buildManifestContext(
  rule: Rule,
  config: ResolvedConfig,
  deps: ManifestContextDeps,
): ManifestRuleContext {
  return {
    ...baseContext(rule, config),
    manifests: deps.manifests,
    cwd: deps.cwd,
    logger: deps.logger,
  };
}

/** Build the CensusRuleContext for `rule`: severity, options and the FileCensus. */
export function buildCensusContext(
  rule: Rule,
  config: ResolvedConfig,
  deps: CensusContextDeps,
): CensusRuleContext {
  return { ...baseContext(rule, config), census: deps.census, logger: deps.logger };
}
