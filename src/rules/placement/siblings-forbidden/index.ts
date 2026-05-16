/**
 * @fileoverview siblings-forbidden rule — flags sideways imports between sibling branches.
 */
import type { Rule } from '../../../types.js';
import { makeThinPlacementRule } from '../thin-rule.js';

/** Rule: entities in sibling branches of a shared parent must not import each other. */
export const siblingsForbiddenRule: Rule = makeThinPlacementRule({
  id: 'siblings-forbidden',
  defaultSeverity: 'error',
});
