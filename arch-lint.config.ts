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
  // Only real overrides are listed; every other metrics rule runs at its
  // built-in default via the `metrics` pack.
  rules: {
    // runner is the composition root — it wires every subsystem together, so its
    // high efferent coupling is correct by role, not a leak to fix.
    'efferent-coupling': { allow: ['runner'] },
    // severity raised from the rule default `info`: a leaf subsystem drifting
    // unstable is a real architectural regression worth a warning.
    instability: {
      severity: 'warning',
      maxForLeafSubsystems: 0.4,
      leafSubsystems: ['config', 'graph', 'suppress', 'baseline'],
    },
    // types.ts and config/types.ts are deliberate shared lexicon — the core
    // Diagnostic / ResolvedConfig vocabulary that every pack imports.
    'cross-cutting-concern': { allow: ['src/types.ts', 'src/config/types.ts'] },
  },
});
