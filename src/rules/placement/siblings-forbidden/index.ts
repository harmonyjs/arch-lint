/**
 * @fileoverview siblings-forbidden rule — flags a sideways import between
 * sibling component branches.
 */
import type { GraphRule } from '#platform/engine/types.js';
import { makeThinPlacementRule } from '#rules/placement/thin-rule.js';

/** Rule: sibling component branches must not import each other sideways. */
export const siblingsForbidden: GraphRule = makeThinPlacementRule('siblings-forbidden', 'error');
