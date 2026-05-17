/**
 * @fileoverview Tests for analyzePlacement — the §7.3 decision tree (D3).
 */
import { describe, expect, it } from 'vitest';
import type { ResolvedConfig } from '../../config/types.js';
import { makeGraph } from '../test-support/make-graph.js';
import { analyzePlacement } from './analyze.js';
import { componentParentOf } from './tree.js';

function cfg(over: Partial<ResolvedConfig> = {}): ResolvedConfig {
  return {
    conventions: {
      privateSegment: 'slots',
      sharedSegment: 'items',
      libSegment: 'lib',
      hooksSegment: 'hooks',
      explicitClusterSegment: 'ui',
      modelSegment: 'model',
      indexFiles: ['index.ts', 'index.tsx'],
    },
    layers: {},
    rules: { 'lca-placement': { severity: 'warning', promotionThreshold: 2 } },
    ...over,
  } as ResolvedConfig;
}

describe('analyzePlacement gate (§7.2)', () => {
  it('abstains for explicit-placement entities', () => {
    const g = makeGraph({
      nodes: { 'src/App/X': { kind: 'folder', isEntity: true, placementMode: 'explicit' } },
      entityConsumers: { 'src/App/X': ['src/App'] },
    });
    expect(analyzePlacement(g, cfg()).has('src/App/X')).toBe(false);
  });

  it('abstains when an entity has no consumers', () => {
    const g = makeGraph({
      nodes: { 'src/App/X': { kind: 'folder', isEntity: true } },
      entityConsumers: { 'src/App/X': [] },
    });
    expect(analyzePlacement(g, cfg()).has('src/App/X')).toBe(false);
  });

  it('abstains when the only consumer is a descendant of the entity', () => {
    const g = makeGraph({
      nodes: {
        'src/App/X': { kind: 'folder', isEntity: true },
        'src/App/X/Inner': { kind: 'folder', isEntity: true },
      },
      entityConsumers: { 'src/App/X': ['src/App/X/Inner'] },
    });
    expect(analyzePlacement(g, cfg()).has('src/App/X')).toBe(false);
  });

  it('abstains (cross-layer) when consumers are outside the entity layer', () => {
    const g = makeGraph({
      nodes: {
        'src/App/X': { kind: 'folder', isEntity: true },
        'src/api/Caller': { kind: 'folder', isEntity: true },
      },
      entityConsumers: { 'src/App/X': ['src/api/Caller'] },
    });
    const config = cfg({ layers: { 'src/App': { canImport: [] }, 'src/api': { canImport: [] } } });
    expect(analyzePlacement(g, config).has('src/App/X')).toBe(false);
  });
});

describe('analyzePlacement shared branch (n >= promotionThreshold)', () => {
  it('expects items/ under the LCA when two consumers share an ancestor', () => {
    const g = makeGraph({
      nodes: {
        'src/App': { kind: 'folder', isEntity: true },
        'src/App/Header': { kind: 'folder', isEntity: true },
        'src/App/Footer': { kind: 'folder', isEntity: true },
        'src/App/Misplaced': { kind: 'folder', isEntity: true },
      },
      entityConsumers: { 'src/App/Misplaced': ['src/App/Header', 'src/App/Footer'] },
    });
    const v = analyzePlacement(g, cfg()).get('src/App/Misplaced');
    expect(v?.expected).toBe('src/App/items/Misplaced');
    expect(v?.actual).toBe('src/App/Misplaced');
    expect(v?.consumers).toEqual(['src/App/Header', 'src/App/Footer']);
  });

  it('expects items/ at the layer root when consumers have no common entity ancestor', () => {
    const g = makeGraph({
      nodes: {
        'src/App': { kind: 'folder', isEntity: true },
        'src/App/A': { kind: 'folder', isEntity: true },
        'src/App/B': { kind: 'folder', isEntity: true },
        'src/App/Shared': { kind: 'folder', isEntity: true },
      },
      entityConsumers: { 'src/App/Shared': ['src/App/A', 'src/App/B'] },
    });
    const config = cfg({ layers: { 'src/App': { canImport: [] } } });
    const v = analyzePlacement(g, config).get('src/App/Shared');
    expect(v?.expected).toBe('src/App/items/Shared');
  });
});

describe('analyzePlacement single-consumer branch (n == 1)', () => {
  it('expects slots/ under the owner when there is exactly one consumer', () => {
    const g = makeGraph({
      nodes: {
        'src/App': { kind: 'folder', isEntity: true },
        'src/App/Header': { kind: 'folder', isEntity: true },
        'src/App/Lonely': { kind: 'folder', isEntity: true },
      },
      entityConsumers: { 'src/App/Lonely': ['src/App/Header'] },
    });
    const v = analyzePlacement(g, cfg()).get('src/App/Lonely');
    expect(v?.expected).toBe('src/App/Header/slots/Lonely');
    expect(v?.actual).toBe('src/App/Lonely');
  });

  it('abstains when the single consumer is a standalone file', () => {
    const g = makeGraph({
      nodes: {
        'src/App/util.ts': { kind: 'file', isEntity: true },
        'src/App/dep.ts': { kind: 'file', isEntity: true },
      },
      entityConsumers: { 'src/App/dep.ts': ['src/App/util.ts'] },
    });
    expect(analyzePlacement(g, cfg()).has('src/App/dep.ts')).toBe(false);
  });
});

describe('analyzePlacement decision tree §7.3 branches 1-2', () => {
  it('branch 1: actual inside slots/ -> slots-privacy (n-independent)', () => {
    const g = makeGraph({
      nodes: {
        'src/App': { kind: 'folder', isEntity: true },
        'src/App/Header': { kind: 'folder', isEntity: true },
        'src/App/Footer': { kind: 'folder', isEntity: true },
        'src/App/Header/slots/Leaked': { kind: 'folder', isEntity: true },
      },
      entityConsumers: { 'src/App/Header/slots/Leaked': ['src/App/Header', 'src/App/Footer'] },
    });
    const v = analyzePlacement(g, cfg()).get('src/App/Header/slots/Leaked');
    expect(v?.ruleId).toBe('slots-privacy');
  });

  it('branch 2: actual inside items/ and n == 1 -> empty-items-folder', () => {
    const g = makeGraph({
      nodes: {
        'src/App': { kind: 'folder', isEntity: true },
        'src/App/Header': { kind: 'folder', isEntity: true },
        'src/App/items/Underused': { kind: 'folder', isEntity: true },
      },
      entityConsumers: { 'src/App/items/Underused': ['src/App/Header'] },
    });
    const v = analyzePlacement(g, cfg()).get('src/App/items/Underused');
    expect(v?.ruleId).toBe('empty-items-folder');
  });
});

describe('analyzePlacement decision tree §7.3 branches 3-4', () => {
  it('branch 3: a consumer is a sibling under the same component parent -> siblings-forbidden', () => {
    const g = makeGraph({
      nodes: {
        'src/App': { kind: 'folder', isEntity: true },
        'src/App/Header': { kind: 'folder', isEntity: true },
        'src/App/Footer': { kind: 'folder', isEntity: true },
      },
      entityConsumers: { 'src/App/Header': ['src/App/Footer'] },
    });
    expect(componentParentOf('src/App/Header', g, cfg().conventions)).toBe('src/App');
    const v = analyzePlacement(g, cfg()).get('src/App/Header');
    expect(v?.ruleId).toBe('siblings-forbidden');
  });

  it('branch 4: plain LCA mismatch with no sibling consumer -> lca-placement', () => {
    const g = makeGraph({
      nodes: {
        'src/App': { kind: 'folder', isEntity: true },
        'src/App/Deep': { kind: 'folder', isEntity: true },
        'src/App/Deep/A': { kind: 'folder', isEntity: true },
        'src/App/Deep/B': { kind: 'folder', isEntity: true },
        'src/App/Stray': { kind: 'folder', isEntity: true },
      },
      entityConsumers: { 'src/App/Stray': ['src/App/Deep/A', 'src/App/Deep/B'] },
    });
    const v = analyzePlacement(g, cfg()).get('src/App/Stray');
    expect(v?.ruleId).toBe('lca-placement');
    expect(v?.expected).toBe('src/App/Deep/items/Stray');
  });
});

describe('analyzePlacement memoization (D3)', () => {
  it('returns the identical Map instance for the same graph', () => {
    const g = makeGraph({
      nodes: { 'src/App/X': { kind: 'folder', isEntity: true } },
      entityConsumers: { 'src/App/X': [] },
    });
    const first = analyzePlacement(g, cfg());
    const second = analyzePlacement(g, cfg());
    expect(first).toBe(second);
  });
});
