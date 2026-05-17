/**
 * @fileoverview structure pack aggregate — collects the file-tree convention rules
 * for the registry.
 */
import type { Rule } from '#rules/types.js';
import { noUpwardRelativeImport } from './no-upward-relative-import/index.js';
import { orphanTest } from './orphan-test/index.js';
import { prefixClusterFolder } from './prefix-cluster-folder/index.js';

/** Every rule of the structure pack — a mix of graph and syntactic engines. */
export const structureRules: readonly Rule[] = [
  prefixClusterFolder,
  orphanTest,
  noUpwardRelativeImport as Rule,
];
