/**
 * @fileoverview hygiene pack aggregate — collects all 4 manifest-strictness rules for the registry.
 */
import type { Rule } from '#platform/engine/types.js';
import { exactDependencyVersions } from './exact-dependency-versions/index.js';
import { npmrcSettings } from './npmrc-settings/index.js';
import { packageEngines } from './package-engines/index.js';
import { tsconfigStrict } from './tsconfig-strict/index.js';

/** Every rule of the hygiene pack (§13.3). */
export const hygieneRules: readonly Rule[] = [
  tsconfigStrict,
  packageEngines,
  exactDependencyVersions,
  npmrcSettings,
];
