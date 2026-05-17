/**
 * @fileoverview arch-lint configuration for the sample-app example — a layered
 * TypeScript project that arch-lint checks cleanly. The app layer depends on the
 * domain layer, the domain layer depends on the support layer, never the reverse.
 */
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
// Import defineConfig from its source module rather than the public-api barrel:
// the loader evaluates this config through jiti, and pulling in the whole
// barrel would load the entire arch-lint module tree as a parallel instance.
import { defineConfig } from '../../src/config/define-config.js';

// Pin the project root to this config's own directory so arch-lint graphs the
// sample-app sources regardless of the process working directory.
const projectRoot = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  project: { tsconfig: './tsconfig.json', sourceRoot: 'src', cwd: projectRoot },
  // layers — direction of allowed dependencies between source layers.
  // barrels — folder internals stay private behind the folder barrel.
  // placement — every entity sits at the lowest common ancestor of its consumers.
  // meta — every internal import resolves; no expired suppressions.
  packs: ['layers', 'barrels', 'placement', 'meta'],
  layers: {
    'src/app': { canImport: ['src/domain', 'src/support'] },
    'src/domain': { canImport: ['src/support'] },
    'src/support': { canImport: [] },
  },
  // The example is genuinely clean — there is no baseline file to load, so a
  // missing baseline is a no-op rather than an error.
  baseline: { missingBehavior: 'ignore' },
});
