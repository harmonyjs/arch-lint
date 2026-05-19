/**
 * @fileoverview placement pack aggregate — collects the four placement rules
 * for the registry. Each rule projects one verdict kind from analyzePlacement.
 */
import type { GraphRule } from '#platform/engine/types.js';
import { emptyItemsFolder } from './empty-items-folder/index.js';
import { lcaPlacement } from './lca-placement/index.js';
import { siblingsForbidden } from './siblings-forbidden/index.js';
import { slotsPrivacy } from './slots-privacy/index.js';

/** Every rule of the placement pack. */
export const placementRules: readonly GraphRule[] = [
  lcaPlacement,
  slotsPrivacy,
  siblingsForbidden,
  emptyItemsFolder,
];
