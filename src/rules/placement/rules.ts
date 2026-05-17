/**
 * @fileoverview Placement rule family — the four placement rules are one
 * analysis (analyzePlacement) projected through four verdict ids. This module
 * is the single source of truth for that family's membership.
 */
import type { ActiveSeverity } from '../../types.js';
import type { Rule } from '../types.js';
import type { PlacementVerdict } from './analyze.js';
import { makeThinPlacementRule } from './thin-rule.js';

/**
 * One placement rule: its id (also its verdict kind — verdicts are keyed by
 * rule id), its default severity, and the doc page consumed by `explain`.
 */
export interface PlacementRuleDescriptor {
  readonly ruleId: PlacementVerdict['ruleId'];
  readonly defaultSeverity: ActiveSeverity;
  readonly docsPath: string;
}

/** The placement rule family — add a rule here and it is registered automatically. */
export const placementRuleDescriptors: readonly PlacementRuleDescriptor[] = [
  { ruleId: 'lca-placement', defaultSeverity: 'warning', docsPath: 'docs/rules/lca-placement.md' },
  { ruleId: 'slots-privacy', defaultSeverity: 'error', docsPath: 'docs/rules/slots-privacy.md' },
  {
    ruleId: 'siblings-forbidden',
    defaultSeverity: 'error',
    docsPath: 'docs/rules/siblings-forbidden.md',
  },
  {
    ruleId: 'empty-items-folder',
    defaultSeverity: 'warning',
    docsPath: 'docs/rules/empty-items-folder.md',
  },
];

/** Builds every placement Rule by projecting each descriptor through makeThinPlacementRule. */
export function buildPlacementRules(): readonly Rule[] {
  return placementRuleDescriptors.map((d) =>
    makeThinPlacementRule({ id: d.ruleId, defaultSeverity: d.defaultSeverity }),
  );
}
