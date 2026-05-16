/**
 * @fileoverview lca-placement rule — flags entities living outside their consumers' LCA.
 */
import type { Rule } from '../../types.js';
import { makeThinPlacementRule } from '../placement/thin-rule.js';

/** Rule: an entity must live in the LCA of its consumers (intra-layer). */
export const lcaPlacementRule: Rule = makeThinPlacementRule({
  id: 'lca-placement',
  defaultSeverity: 'warning',
});
