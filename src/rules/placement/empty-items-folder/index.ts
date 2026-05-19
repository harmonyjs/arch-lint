/**
 * @fileoverview empty-items-folder rule — flags a shared items/ folder with
 * too few consumers to justify promotion out of a private slot.
 */
import type { GraphRule } from '#platform/engine/types.js';
import { makeThinPlacementRule } from '#rules/placement/thin-rule.js';

/** Rule: a shared items/ entity needs enough consumers to justify promotion. */
export const emptyItemsFolder: GraphRule = makeThinPlacementRule('empty-items-folder', 'warning');
