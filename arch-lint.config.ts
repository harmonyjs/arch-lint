/**
 * @fileoverview arch-lint's own configuration — arch-lint lints itself.
 */
import { defineConfig } from './src/public-api.js';

export default defineConfig({
  project: { tsconfig: './tsconfig.json', sourceRoot: 'src' },
  packs: ['layers', 'barrels', 'placement', 'meta', 'perfile', 'hygiene', 'structure', 'metrics'],
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
  // The metrics pack's unit of measurement — one declared unit per
  // <layer>/<module> directory. `unitOf` matches a file by its most-specific
  // glob; files outside every unit (src/public-api.ts, layer-root files) are
  // excluded from metrics. `runner/baseline` and `runner/graphdoc` are more
  // specific than `runner`, so they win for their own files.
  units: {
    'foundation/config': 'foundation/config/**',
    'foundation/entity-id': 'foundation/entity-id/**',
    'foundation/errors': 'foundation/errors/**',
    'foundation/logger': 'foundation/logger/**',
    'foundation/manifest': 'foundation/manifest/**',
    'foundation/source-files': 'foundation/source-files/**',
    'foundation/suppress': 'foundation/suppress/**',
    'foundation/types': 'foundation/types/**',
    'platform/ast': 'platform/ast/**',
    'platform/engine': 'platform/engine/**',
    'platform/graph': 'platform/graph/**',
    'rules/barrels': 'rules/barrels/**',
    'rules/hygiene': 'rules/hygiene/**',
    'rules/layers': 'rules/layers/**',
    'rules/meta': 'rules/meta/**',
    'rules/metrics': 'rules/metrics/**',
    'rules/perfile': 'rules/perfile/**',
    'rules/placement': 'rules/placement/**',
    'rules/structure': 'rules/structure/**',
    'rules/view': 'rules/view/**',
    report: 'report/**',
    runner: 'runner/**',
    'runner/baseline': 'runner/baseline/**',
    'runner/graphdoc': 'runner/graphdoc/**',
  },
  rules: {
    // afferent-coupling's default max (6) assumes a flat app. arch-lint is a
    // layered framework: its `foundation/*` and `platform/*` kernels exist to be
    // depended on — `foundation/types` is the shared vocabulary of nearly every
    // unit. High fan-in is correct by role for these five; exempt them per-unit
    // so the default cap still catches any ordinary unit that fans in too wide.
    'afferent-coupling': {
      allow: [
        'foundation/config',
        'foundation/entity-id',
        'foundation/types',
        'platform/engine',
        'platform/graph',
      ],
    },
    // unit-cohesion measures whether a unit's files import each other. arch-lint
    // modules are deliberately registries of independent single-responsibility
    // files — each rule pack (`rules/*`) holds self-contained rule folders, and
    // `foundation/manifest` / `platform/ast` are collections of standalone
    // helpers. Zero intra-module import cohesion is the expected shape of a
    // well-decomposed linter, not a missing seam.
    'unit-cohesion': {
      ignoreUnits: [
        'foundation/manifest',
        'platform/ast',
        'rules/barrels',
        'rules/hygiene',
        'rules/layers',
        'rules/meta',
        'rules/structure',
        'rules/view',
      ],
    },
    // efferent-coupling flags units depending on > 4 others. These are genuine
    // hubs whose fan-out is inherent: `runner` orchestrates the whole pipeline,
    // `platform/engine` is the rule-engine integration kernel, each rule pack
    // must pull the foundation vocabulary plus the platform graph/ast primitives
    // it analyzes, and `runner/baseline` composes config + engine + runner.
    // `rules/perfile` joins its sibling rule packs: it depends on `foundation/
    // config`, `foundation/types`, `platform/ast`, `platform/engine`, and
    // `platform/graph` (which now also provides the node-id source-file lookup)
    // — the same kernel-and-vocabulary fan-out inherent to every rule pack's role.
    'efferent-coupling': {
      allow: [
        'platform/engine',
        'rules/barrels',
        'rules/layers',
        'rules/perfile',
        'rules/placement',
        'rules/structure',
        'rules/view',
        'runner',
        'runner/baseline',
      ],
    },
    // cross-cutting-concern flags platform/ast — it trips all four signals at
    // the threshold (Ca=5, Ce=4, cohesion 0.25, abstractness 0.09). But it is a
    // deliberate shared kernel: a flat collection of low-level AST helper
    // functions — widely used, built on a few graph primitives, and concrete by
    // nature. The conjunction matches the shape, but the kernel role is sound.
    'cross-cutting-concern': { allow: ['platform/ast'] },
  },
});
