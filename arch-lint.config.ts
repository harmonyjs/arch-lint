/**
 * @fileoverview arch-lint's own configuration — arch-lint lints itself.
 */
import { defineConfig } from './src/public-api.js';

export default defineConfig({
  project: { tsconfig: './tsconfig.json', sourceRoot: 'src' },
  // The `metrics` pack is intentionally absent from this self-lint. Its unit of
  // measurement — the "subsystem" — is defined positionally (the first path
  // segment under the source root), which the layer extraction collapsed onto
  // whole layers. A declarative, architecture-agnostic unit definition is being
  // designed separately; until it lands the pack reports false positives on
  // this codebase's own granular structure (cohesion of rule-pack folders,
  // fan-in of shared type modules). The pack still ships for downstream use.
  packs: ['layers', 'barrels', 'placement', 'meta', 'perfile', 'hygiene', 'structure'],
  ignore: ['**/fixtures/**', '**/test-support/**'],
  baseline: { missingBehavior: 'ignore' },
  // The src/ layer cake — each key is a top-level src/ folder; canImport names
  // the layers below it that it may depend on. `layerOf` classifies a file by
  // its longest path-prefix; `src/public-api.ts` sits at the src/ root, outside
  // every layer, so `layer-boundary` skips its edges.
  layers: {
    foundation: { canImport: [] },
    platform: { canImport: ['foundation'] },
    rules: { canImport: ['foundation', 'platform'] },
    report: { canImport: ['foundation', 'platform', 'rules'] },
    runner: { canImport: ['foundation', 'platform', 'rules', 'report'] },
  },
});
