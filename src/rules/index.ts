/**
 * @fileoverview Rule registry — aggregates all built-in rules and resolves the active set.
 */
import type { ResolvedConfig } from '#config/types.js';
import type { Severity } from '#types.js';
import { barrelIsPublicFace } from './barrels/barrel-is-public-face/index.js';
import { barrelNarrowExport } from './barrels/barrel-narrow-export/index.js';
import { barrelRequiredForRole } from './barrels/barrel-required-for-role/index.js';
import { noWildcardReexport } from './barrels/no-wildcard-reexport/index.js';
import { hygieneRules } from './hygiene/index.js';
import { layerBoundaryRule } from './layers/layer-boundary/index.js';
import { libPurityRule } from './layers/lib-purity/index.js';
import { expiredSuppressRule } from './meta/expired-suppress/index.js';
import { unresolvedImportRule } from './meta/unresolved-import/index.js';
import { metricsRules } from './metrics/index.js';
import { perfileRules } from './perfile/index.js';
import { registerPlacementRules } from './placement/index.js';
import { structureRules } from './structure/index.js';
import type { Rule } from './types.js';
import { hooksFolderRequired } from './view/hooks-folder-required/index.js';
import { tokensImportIsSideEffect } from './view/tokens-import-is-side-effect/index.js';
import { uiClusterMembership } from './view/ui-cluster-membership/index.js';

/**
 * Every built-in rule across all packs. Rules typed with a concrete options generic
 * (`Rule<TOptions>`) are widened to `Rule` here — the engine resolves and injects each
 * rule's options at runtime (`buildRuleContext`).
 */
export const allRules: readonly Rule[] = [
  ...registerPlacementRules(),
  layerBoundaryRule,
  libPurityRule,
  unresolvedImportRule,
  expiredSuppressRule,
  barrelIsPublicFace as Rule,
  barrelRequiredForRole as Rule,
  noWildcardReexport,
  barrelNarrowExport as Rule,
  uiClusterMembership as Rule,
  hooksFolderRequired as Rule,
  tokensImportIsSideEffect as Rule,
  ...perfileRules,
  ...hygieneRules,
  ...metricsRules,
  ...structureRules,
];

/** Effective severity of `rule` under `config` — configured override or default. */
function severityOf(rule: Rule, config: ResolvedConfig): Severity {
  return config.rules[rule.id]?.severity ?? rule.defaultSeverity;
}

/** True when `rule` passes the severity and optional --rules filters. */
function passesFilters(
  rule: Rule,
  config: ResolvedConfig,
  filter: ReadonlySet<string> | null,
): boolean {
  return severityOf(rule, config) !== 'off' && (filter === null || filter.has(rule.id));
}

/**
 * Resolve the active rule set (§8.1, D8): built-ins gated by enabled `packs`, plus
 * always-on `plugins`; both subject to severity ≠ 'off' and the optional --rules filter.
 */
export function getActiveRules(
  config: ResolvedConfig,
  ruleFilter?: readonly string[],
): readonly Rule[] {
  const enabledPacks = new Set(config.packs);
  const filter = ruleFilter === undefined ? null : new Set(ruleFilter);
  const builtins = allRules.filter(
    (rule) => enabledPacks.has(rule.pack) && passesFilters(rule, config, filter),
  );
  // Safe: pluginRuleSchema (config/schema.ts) validates plugin structure on load.
  const pluginRules = config.plugins as readonly Rule[];
  const plugins = pluginRules.filter((rule) => passesFilters(rule, config, filter));
  return [...builtins, ...plugins];
}
