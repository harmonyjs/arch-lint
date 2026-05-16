import { describe, expect, it } from 'vitest';
import type { Config } from '../types.js';
import { resolveConfig } from './resolve-defaults.js';

const minimal: Config = { project: { tsconfig: './tsconfig.json' } };

describe('resolveConfig — project defaults', () => {
  it('fills project.sourceRoot with "src"', () => {
    expect(resolveConfig(minimal).project.sourceRoot).toBe('src');
  });

  it('fills project.includeOutOfRoot with false', () => {
    expect(resolveConfig(minimal).project.includeOutOfRoot).toBe(false);
  });

  it('preserves an explicit sourceRoot', () => {
    const cfg: Config = { project: { tsconfig: './tsconfig.json', sourceRoot: 'lib' } };
    expect(resolveConfig(cfg).project.sourceRoot).toBe('lib');
  });

  it('fills project.cwd with process.cwd()', () => {
    expect(resolveConfig(minimal).project.cwd).toBe(process.cwd());
  });

  it('leaves rootAlias absent when not provided', () => {
    expect(resolveConfig(minimal).project.rootAlias).toBeUndefined();
  });

  it('preserves an explicit rootAlias', () => {
    const cfg: Config = { project: { tsconfig: './tsconfig.json', rootAlias: '@' } };
    expect(resolveConfig(cfg).project.rootAlias).toBe('@');
  });
});

describe('resolveConfig — packs default', () => {
  it('defaults packs to the framework-agnostic set (no view)', () => {
    expect(resolveConfig(minimal).packs).toEqual([
      'layers',
      'barrels',
      'placement',
      'meta',
      'perfile',
      'hygiene',
    ]);
  });

  it('preserves explicit packs', () => {
    const cfg: Config = { project: { tsconfig: './tsconfig.json' }, packs: ['view', 'meta'] };
    expect(resolveConfig(cfg).packs).toEqual(['view', 'meta']);
  });
});

describe('resolveConfig — conventions defaults', () => {
  it('fills conventions with the §B defaults', () => {
    expect(resolveConfig(minimal).conventions).toEqual({
      privateSegment: 'slots',
      sharedSegment: 'items',
      libSegment: 'lib',
      hooksSegment: 'hooks',
      explicitClusterSegment: 'ui',
      modelSegment: 'model',
      indexFiles: ['index.ts', 'index.tsx'],
    });
  });

  it('merges a partial conventions block over defaults', () => {
    const cfg: Config = {
      project: { tsconfig: './tsconfig.json' },
      conventions: { privateSegment: 'private' },
    };
    const resolved = resolveConfig(cfg).conventions;
    expect(resolved.privateSegment).toBe('private');
    expect(resolved.sharedSegment).toBe('items');
  });
});

describe('resolveConfig — resolve defaults', () => {
  it('fills resolve with the §B defaults', () => {
    expect(resolveConfig(minimal).resolve).toEqual({
      treatTypeOnlyAsEdge: true,
      maxResolveDepth: 32,
      cacheSize: Infinity,
      extensions: ['.ts', '.tsx'],
    });
  });

  it('merges a partial resolve block over defaults', () => {
    const cfg: Config = {
      project: { tsconfig: './tsconfig.json' },
      resolve: { maxResolveDepth: 16 },
    };
    const resolved = resolveConfig(cfg).resolve;
    expect(resolved.maxResolveDepth).toBe(16);
    expect(resolved.treatTypeOnlyAsEdge).toBe(true);
  });
});

describe('resolveConfig — baseline / suppress / report / runMode defaults', () => {
  it('fills baseline defaults', () => {
    expect(resolveConfig(minimal).baseline).toEqual({
      file: '.arch-lint-baseline.json',
      sortRecords: 'alphabetical',
      missingBehavior: 'error',
    });
  });

  it('merges a partial baseline block', () => {
    const cfg: Config = {
      project: { tsconfig: './tsconfig.json' },
      baseline: { missingBehavior: 'ignore' },
    };
    expect(resolveConfig(cfg).baseline.missingBehavior).toBe('ignore');
  });

  it('fills suppress defaults', () => {
    expect(resolveConfig(minimal).suppress).toEqual({
      marker: '@arch-decision',
      minReasonLength: 12,
      expirySupport: true,
      scanLocations: ['leading-comment', 'jsdoc'],
      maxDistanceLines: 5,
    });
  });

  it('merges a partial suppress block', () => {
    const cfg: Config = {
      project: { tsconfig: './tsconfig.json' },
      suppress: { marker: '@arch', minReasonLength: 4 },
    };
    const resolved = resolveConfig(cfg).suppress;
    expect(resolved.marker).toBe('@arch');
    expect(resolved.expirySupport).toBe(true);
  });

  it('fills report.cli defaults', () => {
    expect(resolveConfig(minimal).report.cli).toEqual({
      color: 'auto',
      showSuggestions: true,
      showConsumers: true,
      hyperlinks: 'auto',
      foldLongLists: true,
    });
  });

  it('merges a partial report.cli block', () => {
    const cfg: Config = {
      project: { tsconfig: './tsconfig.json' },
      report: { cli: { color: 'never' } },
    };
    const resolved = resolveConfig(cfg).report.cli;
    expect(resolved.color).toBe('never');
    expect(resolved.showSuggestions).toBe(true);
  });

  it('fills runMode defaults', () => {
    expect(resolveConfig(minimal).runMode).toEqual({
      watch: { rules: 'all', debounceMs: 200, clearOnRerun: true },
      preCommit: { rules: 'all', maxDurationMs: 5000, failOnViolations: true },
      ci: { failOnViolations: true },
    });
  });

  it('merges partial runMode sub-blocks', () => {
    const cfg: Config = {
      project: { tsconfig: './tsconfig.json' },
      runMode: {
        watch: { debounceMs: 50 },
        preCommit: { maxDurationMs: 1000 },
        ci: { failOnViolations: false },
      },
    };
    const resolved = resolveConfig(cfg).runMode;
    expect(resolved.watch.debounceMs).toBe(50);
    expect(resolved.watch.rules).toBe('all');
    expect(resolved.preCommit.maxDurationMs).toBe(1000);
    expect(resolved.ci.failOnViolations).toBe(false);
  });
});

describe('resolveConfig — empty collections', () => {
  it('defaults layers, explicitPlacement, ignore, plugins, rules, perFileRules to empty', () => {
    const resolved = resolveConfig(minimal);
    expect(resolved.layers).toEqual({});
    expect(resolved.explicitPlacement).toEqual([]);
    expect(resolved.ignore).toEqual([]);
    expect(resolved.plugins).toEqual([]);
    expect(resolved.rules).toEqual({});
    expect(resolved.perFileRules).toEqual({});
  });

  it('preserves explicit layers, explicitPlacement and ignore', () => {
    const cfg: Config = {
      project: { tsconfig: './tsconfig.json' },
      layers: { 'src/lib': { canImport: [] } },
      explicitPlacement: [{ path: 'src/ui/**', cluster: 'ds' }],
      ignore: ['**/*.test.ts'],
    };
    const resolved = resolveConfig(cfg);
    expect(resolved.layers).toEqual({ 'src/lib': { canImport: [] } });
    expect(resolved.explicitPlacement).toEqual([{ path: 'src/ui/**', cluster: 'ds' }]);
    expect(resolved.ignore).toEqual(['**/*.test.ts']);
  });
});

describe('resolveConfig — RuleSetting normalization', () => {
  it('normalizes a bare severity string to an object', () => {
    const cfg: Config = {
      project: { tsconfig: './tsconfig.json' },
      rules: { 'slots-privacy': 'error' },
    };
    expect(resolveConfig(cfg).rules['slots-privacy']).toEqual({ severity: 'error' });
  });

  it('keeps an object rule setting with its options', () => {
    const cfg: Config = {
      project: { tsconfig: './tsconfig.json' },
      rules: { 'lca-placement': { severity: 'warning', promotionThreshold: 3 } },
    };
    expect(resolveConfig(cfg).rules['lca-placement']).toEqual({
      severity: 'warning',
      promotionThreshold: 3,
    });
  });

  it('fills severity "warning" for an object rule setting without severity', () => {
    const cfg: Config = {
      project: { tsconfig: './tsconfig.json' },
      rules: { 'max-lines': { max: 120 } },
    };
    expect(resolveConfig(cfg).rules['max-lines']).toEqual({ severity: 'warning', max: 120 });
  });

  it('normalizes perFileRules the same way', () => {
    const cfg: Config = {
      project: { tsconfig: './tsconfig.json' },
      perFileRules: { 'single-entity-per-file': 'error' },
    };
    expect(resolveConfig(cfg).perFileRules['single-entity-per-file']).toEqual({
      severity: 'error',
    });
  });
});
