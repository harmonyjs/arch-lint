/**
 * @fileoverview arch-lint's own configuration — arch-lint lints itself, including
 * the metrics pack that measures this codebase's subsystem coupling.
 */
import { defineConfig } from './src/public-api.js';

export default defineConfig({
  project: { tsconfig: './tsconfig.json', sourceRoot: 'src' },
  packs: ['layers', 'barrels', 'placement', 'meta', 'perfile', 'hygiene', 'metrics'],
  rules: {
    'efferent-coupling': { severity: 'warning', max: 4 },
    'afferent-coupling': { severity: 'info', max: 6 },
    instability: {
      severity: 'warning',
      maxForLeafSubsystems: 0.4,
      leafSubsystems: ['config', 'graph', 'suppress', 'baseline'],
    },
    'subsystem-cohesion': { severity: 'warning', min: 0.3 },
    'cross-cutting-concern': {
      severity: 'info',
      maxSubsystems: 5,
      allow: ['src/types.ts', 'src/errors.ts'],
    },
  },
});
