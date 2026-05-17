/**
 * @fileoverview Placement family registration — the rule registry calls this
 * once; the family's membership stays a placement implementation detail.
 */
import type { Rule } from '../types.js';
import { placementRuleDescriptors } from './rules.js';
import { makeThinPlacementRule } from './thin-rule.js';

/** Every placement Rule, projected from the family descriptors. */
export function registerPlacementRules(): readonly Rule[] {
  return placementRuleDescriptors.map((d) =>
    makeThinPlacementRule({ id: d.ruleId, defaultSeverity: d.defaultSeverity }),
  );
}
