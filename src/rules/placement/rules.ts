/**
 * @fileoverview Placement rule family descriptor data — the single source of
 * truth for which rules belong to the family. Each descriptor pairs a verdict
 * id with its default severity; `register.ts` projects them into Rules.
 */
import type { ActiveSeverity } from '../../types.js';
import type { PlacementVerdict } from './analyze.js';

/**
 * One placement rule: its id (also its verdict kind — verdicts are keyed by
 * rule id) and its default severity.
 */
export interface PlacementRuleDescriptor {
  readonly id: PlacementVerdict['ruleId'];
  readonly defaultSeverity: ActiveSeverity;
}

/** The placement rule family — add a rule here and it is registered automatically. */
export const placementRuleDescriptors: readonly PlacementRuleDescriptor[] = [
  { id: 'lca-placement', defaultSeverity: 'warning' },
  { id: 'slots-privacy', defaultSeverity: 'error' },
  { id: 'siblings-forbidden', defaultSeverity: 'error' },
  { id: 'empty-items-folder', defaultSeverity: 'warning' },
];
