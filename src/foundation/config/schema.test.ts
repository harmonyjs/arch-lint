import { describe, expect, it } from 'vitest';
import { ConfigError } from '#foundation/errors/index.js';
import { configSchema, ruleSettingSchema, validateConfig } from './schema.js';

describe('ruleSettingSchema', () => {
  it('accepts a bare severity string', () => {
    expect(ruleSettingSchema.parse('error')).toBe('error');
  });

  it('accepts an object with severity and extra options', () => {
    const parsed = ruleSettingSchema.parse({ severity: 'warning', max: 200 });
    expect(parsed).toEqual({ severity: 'warning', max: 200 });
  });

  it('accepts an object without severity', () => {
    expect(ruleSettingSchema.parse({ max: 60 })).toEqual({ max: 60 });
  });

  it('rejects an invalid severity string', () => {
    expect(() => ruleSettingSchema.parse('loud')).toThrow();
  });
});

describe('configSchema — project', () => {
  it('accepts a minimal config with only project.tsconfig', () => {
    const parsed = configSchema.parse({ project: { tsconfig: './tsconfig.json' } });
    expect(parsed.project.tsconfig).toBe('./tsconfig.json');
  });

  it('rejects a config missing project.tsconfig', () => {
    expect(() => configSchema.parse({ project: {} })).toThrow();
  });

  it('rejects a config missing project entirely', () => {
    expect(() => configSchema.parse({})).toThrow();
  });

  it('accepts optional project fields', () => {
    const parsed = configSchema.parse({
      project: { tsconfig: './tsconfig.json', sourceRoot: 'lib', includeOutOfRoot: true },
    });
    expect(parsed.project.sourceRoot).toBe('lib');
    expect(parsed.project.includeOutOfRoot).toBe(true);
  });

  it('accepts a conventions block', () => {
    const parsed = configSchema.parse({
      project: { tsconfig: './tsconfig.json' },
      conventions: { privateSegment: 'private', indexFiles: ['index.ts'] },
    });
    expect(parsed.conventions?.privateSegment).toBe('private');
  });
});

describe('configSchema — structural blocks', () => {
  it('accepts a layers block', () => {
    const parsed = configSchema.parse({
      project: { tsconfig: './tsconfig.json' },
      layers: {
        'src/App': { canImport: ['src/lib'] },
        'src/lib': { canImport: [], sideEffectOnly: [] },
      },
    });
    expect(parsed.layers?.['src/App']?.canImport).toEqual(['src/lib']);
  });

  it('accepts a resolve block', () => {
    const parsed = configSchema.parse({
      project: { tsconfig: './tsconfig.json' },
      resolve: { treatTypeOnlyAsEdge: false, maxResolveDepth: 16, extensions: ['.ts'] },
    });
    expect(parsed.resolve?.maxResolveDepth).toBe(16);
  });

  it('accepts explicitPlacement rules', () => {
    const parsed = configSchema.parse({
      project: { tsconfig: './tsconfig.json' },
      explicitPlacement: [{ path: 'src/ui/**', cluster: 'ds', excludeRules: ['lca-placement'] }],
    });
    expect(parsed.explicitPlacement?.[0]?.cluster).toBe('ds');
  });

  it('accepts baseline, suppress, report, runMode, ignore, plugins, packs', () => {
    const parsed = configSchema.parse({
      project: { tsconfig: './tsconfig.json' },
      packs: ['layers', 'meta'],
      ignore: ['**/*.test.ts'],
      baseline: { file: '.bl.json', missingBehavior: 'ignore' },
      suppress: { marker: '@arch-decision', minReasonLength: 8 },
      report: { cli: { color: 'never', foldLongLists: false } },
      runMode: { ci: { failOnViolations: false } },
      plugins: [],
    });
    expect(parsed.packs).toEqual(['layers', 'meta']);
    expect(parsed.baseline?.missingBehavior).toBe('ignore');
  });

  it('rejects an invalid pack name', () => {
    expect(() =>
      configSchema.parse({ project: { tsconfig: './tsconfig.json' }, packs: ['bogus'] }),
    ).toThrow();
  });

  it('accepts the structure pack', () => {
    const parsed = configSchema.parse({
      project: { tsconfig: './tsconfig.json' },
      packs: ['structure'],
    });
    expect(parsed.packs).toEqual(['structure']);
  });

  it('rejects an invalid baseline.missingBehavior', () => {
    expect(() =>
      configSchema.parse({
        project: { tsconfig: './tsconfig.json' },
        baseline: { missingBehavior: 'crash' },
      }),
    ).toThrow();
  });
});

describe('configSchema — view block', () => {
  it('accepts view.region "auto"', () => {
    expect(() =>
      validateConfig({ project: { tsconfig: './tsconfig.json' }, view: { region: 'auto' } }),
    ).not.toThrow();
  });

  it('accepts view.region as a string array', () => {
    expect(() =>
      validateConfig({ project: { tsconfig: './tsconfig.json' }, view: { region: ['src/ui'] } }),
    ).not.toThrow();
  });

  it('rejects a numeric view.region', () => {
    expect(() =>
      validateConfig({ project: { tsconfig: './tsconfig.json' }, view: { region: 7 } }),
    ).toThrow(/view\.region/);
  });
});

describe('configSchema — rules block', () => {
  it('accepts the full §B rules block (architectural + hygiene rules)', () => {
    const parsed = configSchema.parse({
      project: { tsconfig: './tsconfig.json' },
      rules: {
        'lca-placement': { severity: 'warning', promotionThreshold: 2 },
        'slots-privacy': 'error',
        'siblings-forbidden': 'error',
        'layer-boundary': 'error',
        'empty-items-folder': 'warning',
        'barrel-is-public-face': {
          severity: 'error',
          enforceForSegments: 'all',
          allowExplicitIndex: false,
          allowSiblingImports: true,
        },
        'barrel-required-for-role': {
          severity: 'error',
          enforceForSegments: 'all',
          exemptPaths: ['src/main.tsx'],
        },
        'no-wildcard-reexport': 'error',
        'barrel-narrow-export': {
          severity: 'warning',
          allowTypeReexports: true,
          allowPrefixedConstants: true,
        },
        'ui-cluster-membership': {
          severity: 'error',
          triggerPackages: ['@react-aria/*'],
          mustLiveIn: 'src/App/ui',
        },
        'lib-purity': {
          severity: 'error',
          forbiddenImports: ['react'],
          enforceForSegments: ['lib'],
        },
        'hooks-folder-required': {
          severity: 'error',
          hookFilePattern: '^use-.*\\.tsx?$',
          strictCheck: true,
        },
        'tokens-import-is-side-effect': {
          severity: 'warning',
          allowedImporters: ['src/main.tsx'],
          requiredForm: 'side-effect',
        },
        'unresolved-import': 'warning',
        'expired-suppress': 'warning',
        'tsconfig-strict': { severity: 'error', preset: 'strictest' },
        'package-engines': { severity: 'error', requiredKeys: ['node', 'npm'] },
        'exact-dependency-versions': {
          severity: 'error',
          sections: ['dependencies', 'devDependencies'],
        },
        'npmrc-settings': {
          severity: 'error',
          required: { 'engine-strict': true, 'save-exact': true },
        },
      },
    });
    expect(parsed.rules?.['lca-placement']).toEqual({ severity: 'warning', promotionThreshold: 2 });
    expect(parsed.rules?.['slots-privacy']).toBe('error');
  });

  it('accepts a custom (plugin) rule id in rules', () => {
    const parsed = configSchema.parse({
      project: { tsconfig: './tsconfig.json' },
      rules: { 'my-plugin/custom-rule': 'info' },
    });
    expect(parsed.rules?.['my-plugin/custom-rule']).toBe('info');
  });

  it('rejects an invalid severity inside a rule object', () => {
    expect(() =>
      configSchema.parse({
        project: { tsconfig: './tsconfig.json' },
        rules: { 'lca-placement': { severity: 'screaming' } },
      }),
    ).toThrow();
  });
});

describe('configSchema — perFileRules block', () => {
  it('accepts the full §B perFileRules block (8 rules)', () => {
    const parsed = configSchema.parse({
      project: { tsconfig: './tsconfig.json' },
      perFileRules: {
        'file-description-required': { severity: 'error', tag: '@fileoverview', minLength: 12 },
        'single-entity-per-file': 'error',
        'no-default-export': { severity: 'error', exemptPaths: [] },
        'max-lines': { severity: 'warning', max: 200, skipComments: true, skipBlankLines: true },
        'max-lines-per-function': { severity: 'warning', max: 60 },
        complexity: { severity: 'warning', max: 15 },
        'max-params': { severity: 'warning', max: 4 },
        'max-optional-params': { severity: 'warning', max: 3 },
      },
    });
    expect(parsed.perFileRules?.['max-lines']).toEqual({
      severity: 'warning',
      max: 200,
      skipComments: true,
      skipBlankLines: true,
    });
  });
});

describe('validateConfig', () => {
  it('returns the typed config on valid input', () => {
    const cfg = validateConfig({ project: { tsconfig: './tsconfig.json' } });
    expect(cfg.project.tsconfig).toBe('./tsconfig.json');
  });

  it('throws ConfigError on invalid input', () => {
    expect(() => validateConfig({ project: {} })).toThrow(ConfigError);
  });

  it('ConfigError message includes the offending config path', () => {
    let caught: unknown;
    try {
      validateConfig({ project: { tsconfig: './tsconfig.json' }, packs: ['bogus'] });
    } catch (err) {
      caught = err;
    }
    expect(caught).toBeInstanceOf(ConfigError);
    expect((caught as ConfigError).message).toContain('packs.0');
  });

  it('ConfigError message uses <root> for a root-level issue', () => {
    let caught: unknown;
    try {
      validateConfig(null);
    } catch (err) {
      caught = err;
    }
    expect(caught).toBeInstanceOf(ConfigError);
    expect((caught as ConfigError).message).toContain('<root>');
  });

  it('ConfigError carries the configPath when provided', () => {
    let caught: unknown;
    try {
      validateConfig({ project: {} }, '/proj/arch-lint.config.ts');
    } catch (err) {
      caught = err;
    }
    expect((caught as ConfigError).configPath).toBe('/proj/arch-lint.config.ts');
  });
});

describe('configSchema — units', () => {
  it('accepts a units record of name to glob', () => {
    const parsed = configSchema.parse({
      project: { tsconfig: './tsconfig.json' },
      units: { 'platform/graph': 'platform/graph/**' },
    });
    expect(parsed.units).toEqual({ 'platform/graph': 'platform/graph/**' });
  });

  it('accepts a units value that is a list of globs', () => {
    const parsed = configSchema.parse({
      project: { tsconfig: './tsconfig.json' },
      units: { shared: ['foundation/config/**', 'foundation/types/**'] },
    });
    expect(parsed.units).toEqual({ shared: ['foundation/config/**', 'foundation/types/**'] });
  });

  it('rejects a units value that is a number', () => {
    expect(() =>
      configSchema.parse({ project: { tsconfig: './tsconfig.json' }, units: { x: 5 } }),
    ).toThrow();
  });

  it('rejects an empty-string glob', () => {
    expect(() =>
      configSchema.parse({ project: { tsconfig: './tsconfig.json' }, units: { x: '' } }),
    ).toThrow();
  });

  it('rejects an empty list of globs', () => {
    expect(() =>
      configSchema.parse({ project: { tsconfig: './tsconfig.json' }, units: { x: [] } }),
    ).toThrow();
  });

  it('rejects an empty-string glob inside a list', () => {
    expect(() =>
      configSchema.parse({ project: { tsconfig: './tsconfig.json' }, units: { x: ['a/**', ''] } }),
    ).toThrow();
  });
});
