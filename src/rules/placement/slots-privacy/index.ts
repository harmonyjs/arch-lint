/**
 * @fileoverview slots-privacy rule — flags entities in slots/ imported by a non-owner.
 */
import type { Rule } from '../../types.js';
import { makeThinPlacementRule } from '../thin-rule.js';

/** Rule: an entity under slots/ may be imported only by its owning entity. */
export const slotsPrivacyRule: Rule = makeThinPlacementRule({
  id: 'slots-privacy',
  defaultSeverity: 'error',
});
