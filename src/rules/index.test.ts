/**
 * @fileoverview Tests for the rule registry — allRules and getActiveRules.
 */
import { describe, expect, it } from 'vitest';
import type { ResolvedConfig } from '#foundation/config/types.js';
import type { Rule } from '#platform/engine/types.js';
import { allRules, getActiveRules } from './index.js';

function cfg(over: Partial<ResolvedConfig> = {}): ResolvedConfig {
  return {
    packs: ['placement', 'layers', 'meta'],
    rules: {},
    plugins: [],
    ...over,
  } as ResolvedConfig;
}

const pluginRule: Rule = {
  id: 'custom-plugin-rule',
  pack: 'placement',
  engine: 'graph',
  defaultSeverity: 'warning',
  check: () => [],
};

describe('allRules', () => {
  it('registers the 8 M4 rules', () => {
    const ids = new Set(allRules.map((r) => r.id));
    for (const id of [
      'empty-items-folder',
      'expired-suppress',
      'layer-boundary',
      'lca-placement',
      'lib-purity',
      'siblings-forbidden',
      'slots-privacy',
      'unresolved-import',
    ]) {
      expect(ids.has(id)).toBe(true);
    }
  });

  it('has no duplicate rule ids', () => {
    const ids = allRules.map((r) => r.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe('registry — M5 syntactic packs', () => {
  const m5Ids = [
    'barrel-is-public-face',
    'barrel-required-for-role',
    'no-wildcard-reexport',
    'barrel-narrow-export',
    'ui-cluster-membership',
    'hooks-folder-required',
    'tokens-import-is-side-effect',
  ];

  it('registers all 7 M5 syntactic rules', () => {
    const ids = new Set(allRules.map((r) => r.id));
    for (const id of m5Ids) expect(ids.has(id)).toBe(true);
  });

  it('barrels rules belong to the barrels pack with engine syntactic', () => {
    const barrels = [
      'barrel-is-public-face',
      'barrel-required-for-role',
      'no-wildcard-reexport',
      'barrel-narrow-export',
    ];
    for (const id of barrels) {
      const rule = allRules.find((r) => r.id === id);
      expect(rule?.pack).toBe('barrels');
      expect(rule?.engine).toBe('syntactic');
    }
  });

  it('view rules belong to the view pack with engine syntactic', () => {
    const view = ['ui-cluster-membership', 'hooks-folder-required', 'tokens-import-is-side-effect'];
    for (const id of view) {
      const rule = allRules.find((r) => r.id === id);
      expect(rule?.pack).toBe('view');
      expect(rule?.engine).toBe('syntactic');
    }
  });

  it('M5 rule default severities match spec §8.3', () => {
    const expected: Record<string, string> = {
      'barrel-is-public-face': 'error',
      'barrel-required-for-role': 'error',
      'no-wildcard-reexport': 'error',
      'barrel-narrow-export': 'warning',
      'ui-cluster-membership': 'error',
      'hooks-folder-required': 'error',
      'tokens-import-is-side-effect': 'warning',
    };
    for (const [id, sev] of Object.entries(expected)) {
      expect(allRules.find((r) => r.id === id)?.defaultSeverity).toBe(sev);
    }
  });

  it('keeps every registry rule id unique', () => {
    const ids = allRules.map((r) => r.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe('getActiveRules pack + severity filter', () => {
  it('keeps only rules whose pack is enabled', () => {
    const active = getActiveRules(cfg({ packs: ['placement'] }));
    expect(active.every((r) => r.pack === 'placement')).toBe(true);
    expect(active.map((r) => r.id).sort()).toEqual([
      'empty-items-folder',
      'lca-placement',
      'siblings-forbidden',
      'slots-privacy',
    ]);
  });

  it("drops a rule whose configured severity is 'off'", () => {
    const active = getActiveRules(cfg({ rules: { 'lca-placement': { severity: 'off' } } }));
    expect(active.some((r) => r.id === 'lca-placement')).toBe(false);
    expect(active.some((r) => r.id === 'slots-privacy')).toBe(true);
  });

  it('keeps a rule active with its default severity when not configured', () => {
    const active = getActiveRules(cfg());
    expect(active.some((r) => r.id === 'layer-boundary')).toBe(true);
  });
});

describe('getActiveRules --rules filter', () => {
  it('keeps only rules listed in the ruleFilter', () => {
    const active = getActiveRules(cfg(), ['lca-placement', 'layer-boundary']);
    expect(active.map((r) => r.id).sort()).toEqual(['layer-boundary', 'lca-placement']);
  });

  it('applies the ruleFilter on top of the pack filter', () => {
    const active = getActiveRules(cfg({ packs: ['placement'] }), [
      'layer-boundary',
      'lca-placement',
    ]);
    expect(active.map((r) => r.id)).toEqual(['lca-placement']);
  });

  it('returns nothing for an empty ruleFilter', () => {
    expect(getActiveRules(cfg(), [])).toEqual([]);
  });

  it('ignores the filter when ruleFilter is undefined', () => {
    expect(getActiveRules(cfg(), undefined).length).toBeGreaterThan(0);
  });
});

describe('getActiveRules plugins (D8)', () => {
  it('activates a plugin rule even when its pack is disabled', () => {
    const active = getActiveRules(cfg({ packs: ['layers'], plugins: [pluginRule] }));
    expect(active.some((r) => r.id === 'custom-plugin-rule')).toBe(true);
  });

  it("drops a plugin rule whose configured severity is 'off'", () => {
    const config = cfg({
      packs: ['layers'],
      plugins: [pluginRule],
      rules: { 'custom-plugin-rule': { severity: 'off' } },
    });
    expect(getActiveRules(config).some((r) => r.id === 'custom-plugin-rule')).toBe(false);
  });

  it('subjects a plugin rule to the --rules filter', () => {
    const config = cfg({ packs: ['layers'], plugins: [pluginRule] });
    expect(
      getActiveRules(config, ['layer-boundary']).some((r) => r.id === 'custom-plugin-rule'),
    ).toBe(false);
  });
});
