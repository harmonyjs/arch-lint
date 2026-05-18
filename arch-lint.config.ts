/**
 * @fileoverview arch-lint's own configuration — arch-lint lints itself, including
 * the metrics pack that measures this codebase's subsystem coupling.
 */
import { defineConfig } from './src/public-api.js';

export default defineConfig({
  project: { tsconfig: './tsconfig.json', sourceRoot: 'src' },
  packs: ['layers', 'barrels', 'placement', 'meta', 'perfile', 'hygiene', 'metrics', 'structure'],
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
  // Only real overrides are listed; every other metrics rule runs at its
  // built-in default via the `metrics` pack.
  rules: {
    // runner is the composition root — it wires every subsystem together, so its
    // high efferent coupling is correct by role, not a leak to fix. `runner` is
    // the subsystem of the files directly under src/runner/ (cli.ts, check.ts,
    // watch.ts) — the layer-aware subsystemOf keeps a bare layer name for them.
    'efferent-coupling': { allow: ['runner'] },
    // severity raised from the rule default `info`: a leaf subsystem drifting
    // unstable is a real architectural regression worth a warning.
    instability: {
      severity: 'warning',
      maxForLeafSubsystems: 0.4,
      leafSubsystems: [
        'foundation/config',
        'platform/graph',
        'foundation/suppress',
        'runner/baseline',
      ],
    },
    // foundation/types and foundation/config/types are deliberate shared lexicon —
    // the core Diagnostic / ResolvedConfig vocabulary that every pack imports.
    'cross-cutting-concern': {
      allow: ['src/foundation/types/index.ts', 'src/foundation/config/types.ts'],
    },
  },
});
