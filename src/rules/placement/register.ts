/**
 * @fileoverview Placement family registration — the rule registry calls this
 * once; the family's membership stays a placement implementation detail.
 */
import type { GraphRule } from '#platform/engine/types.js';
import { placementRuleDescriptors } from './family.js';
import { makeThinPlacementRule } from './thin-rule.js';

/** Every placement Rule, projected from the family descriptors. */
export function registerPlacementRules(): readonly GraphRule[] {
  return placementRuleDescriptors.map(makeThinPlacementRule);
}
