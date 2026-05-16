/**
 * @fileoverview Rule registry — aggregates all built-in rules and resolves the active set.
 */
import type { ResolvedConfig, Rule, Severity } from '../types.js';
import { barrelIsPublicFace } from './barrels/barrel-is-public-face/index.js';
import { barrelNarrowExport } from './barrels/barrel-narrow-export/index.js';
import { barrelRequiredForRole } from './barrels/barrel-required-for-role/index.js';
import { noWildcardReexport } from './barrels/no-wildcard-reexport/index.js';
import { layerBoundaryRule } from './layers/layer-boundary/index.js';
import { libPurityRule } from './layers/lib-purity/index.js';
import { expiredSuppressRule } from './meta/expired-suppress/index.js';
import { unresolvedImportRule } from './meta/unresolved-import/index.js';
import { emptyItemsFolderRule } from './placement/empty-items-folder/index.js';
import { lcaPlacementRule } from './placement/lca-placement/index.js';
import { siblingsForbiddenRule } from './placement/siblings-forbidden/index.js';
import { slotsPrivacyRule } from './placement/slots-privacy/index.js';
import { hooksFolderRequired } from './view/hooks-folder-required/index.js';
import { tokensImportIsSideEffect } from './view/tokens-import-is-side-effect/index.js';
import { uiClusterMembership } from './view/ui-cluster-membership/index.js';

/**
 * Every built-in rule. M5/M6 append their packs to this array. Rules typed with a
 * concrete options generic (`Rule<TOptions>`) are widened to `Rule` here — the
 * engine resolves and injects each rule's options at runtime (`buildRuleContext`).
 */
export const allRules: readonly Rule[] = [
  lcaPlacementRule,
  slotsPrivacyRule,
  siblingsForbiddenRule,
  emptyItemsFolderRule,
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
  const plugins = config.plugins.filter((rule) => passesFilters(rule, config, filter));
  return [...builtins, ...plugins];
}
