/**
 * @fileoverview empty-items-folder rule — flags items/ entities with too few consumers.
 */
import type { Rule } from '../../types.js';
import { makeThinPlacementRule } from '../placement/thin-rule.js';

/** Rule: an entity under items/ must have at least `promotionThreshold` consumers. */
export const emptyItemsFolderRule: Rule = makeThinPlacementRule({
  id: 'empty-items-folder',
  defaultSeverity: 'warning',
});
