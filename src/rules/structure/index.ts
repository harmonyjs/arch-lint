/**
 * @fileoverview structure pack aggregate — collects the file-tree convention rules
 * for the registry.
 */
import type { GraphRule } from '../types.js';
import { orphanTest } from './orphan-test/index.js';
import { prefixClusterFolder } from './prefix-cluster-folder/index.js';

/** Every rule of the structure pack. */
export const structureRules: readonly GraphRule[] = [prefixClusterFolder, orphanTest];
