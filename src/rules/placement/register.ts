/**
 * @fileoverview Placement family registration — the rule registry calls this
 * once; the family's membership stays a placement implementation detail.
 */
import type { Rule } from '../types.js';
import { buildPlacementRules } from './rules.js';

/** Every placement Rule, built from the family descriptors. */
export function registerPlacementRules(): readonly Rule[] {
  return buildPlacementRules();
}
