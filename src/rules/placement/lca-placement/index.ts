/**
 * @fileoverview lca-placement rule — flags an entity placed outside the subtree
 * rooted at the lowest common ancestor of its consumers.
 */
import type { GraphRule } from '#platform/engine/types.js';
import { makeThinPlacementRule } from '#rules/placement/thin-rule.js';

/** Rule: an entity must reside within its consumers' LCA subtree. */
export const lcaPlacement: GraphRule = makeThinPlacementRule('lca-placement', 'warning');
