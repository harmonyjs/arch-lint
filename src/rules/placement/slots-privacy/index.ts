/**
 * @fileoverview slots-privacy rule — flags an entity inside a private slots/
 * folder that is imported from outside its owner.
 */
import type { GraphRule } from '#platform/engine/types.js';
import { makeThinPlacementRule } from '#rules/placement/thin-rule.js';

/** Rule: a private-slot entity must not be imported by outside consumers. */
export const slotsPrivacy: GraphRule = makeThinPlacementRule('slots-privacy', 'error');
