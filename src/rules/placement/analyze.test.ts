/**
 * @fileoverview Tests for analyzePlacement — the placement decision tree.
 */
import { describe, expect, it } from 'vitest';
import type { ResolvedConfig } from '#foundation/config/types.js';
import { makeGraph } from '#rules/test-support/make-graph.js';
import { analyzePlacement } from './analyze.js';
import { componentParentOf } from './tree.js';

function cfg(over: Partial<ResolvedConfig> = {}): ResolvedConfig {
  return {
    project: { sourceRoot: 'src' },
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

describe('analyzePlacement gate', () => {
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
    const config = cfg({ layers: { App: { canImport: [] }, api: { canImport: [] } } });
    expect(analyzePlacement(g, config).has('src/App/X')).toBe(false);
  });
});

describe('analyzePlacement lca-placement — universal locality invariant', () => {
  it('abstains when the entity sits within the LCA subtree of its consumers', () => {
    const g = makeGraph({
      nodes: {
        'src/App': { kind: 'folder', isEntity: true },
        'src/App/Deep': { kind: 'folder', isEntity: true },
        'src/App/Deep/A': { kind: 'folder', isEntity: true },
        'src/App/Deep/A/X': { kind: 'folder', isEntity: true },
        'src/App/Deep/B': { kind: 'folder', isEntity: true },
        'src/App/Deep/B/Y': { kind: 'folder', isEntity: true },
        'src/App/Deep/Within': { kind: 'folder', isEntity: true },
      },
      entityConsumers: { 'src/App/Deep/Within': ['src/App/Deep/A/X', 'src/App/Deep/B/Y'] },
    });
    // LCA(A/X, B/Y) = src/App/Deep; Within is `src/App/Deep/Within`, inside that subtree.
    // Within's component parent is src/App/Deep, the consumers' is A/B — not siblings.
    expect(analyzePlacement(g, cfg()).has('src/App/Deep/Within')).toBe(false);
  });

  it('abstains when the entity IS the LCA of its consumers', () => {
    const g = makeGraph({
      nodes: {
        'src/App': { kind: 'folder', isEntity: true },
        'src/App/Panel': { kind: 'folder', isEntity: true },
        'src/App/Panel/A': { kind: 'folder', isEntity: true },
        'src/App/Panel/B': { kind: 'folder', isEntity: true },
      },
      entityConsumers: { 'src/App/Panel': ['src/App/Panel/A', 'src/App/Panel/B'] },
    });
    // Consumers minus self-descendants is empty -> abstains regardless.
    expect(analyzePlacement(g, cfg()).has('src/App/Panel')).toBe(false);
  });

  it('flags the entity when it sits ABOVE the LCA of its consumers', () => {
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
    expect(v?.expected).toBe('src/App/Deep');
    expect(v?.actual).toBe('src/App/Stray');
    expect(v?.consumers).toEqual(['src/App/Deep/A', 'src/App/Deep/B']);
  });

  it('flags the entity when it sits in a cousin branch of the LCA', () => {
    const g = makeGraph({
      nodes: {
        'src/App': { kind: 'folder', isEntity: true },
        'src/App/Left': { kind: 'folder', isEntity: true },
        'src/App/Left/A': { kind: 'folder', isEntity: true },
        'src/App/Left/B': { kind: 'folder', isEntity: true },
        'src/App/Right': { kind: 'folder', isEntity: true },
        'src/App/Right/Cousin': { kind: 'folder', isEntity: true },
      },
      entityConsumers: { 'src/App/Right/Cousin': ['src/App/Left/A', 'src/App/Left/B'] },
    });
    const v = analyzePlacement(g, cfg()).get('src/App/Right/Cousin');
    expect(v?.ruleId).toBe('lca-placement');
    // LCA(Left/A, Left/B) = src/App/Left; Cousin lives under src/App/Right.
    expect(v?.expected).toBe('src/App/Left');
  });

  it('never emits lca-placement on a flat entity tree — every LCA is the layer root', () => {
    const g = makeGraph({
      nodes: {
        'src/App': { kind: 'folder', isEntity: true },
        'src/App/A': { kind: 'folder', isEntity: true },
        'src/App/B': { kind: 'folder', isEntity: true },
        'src/App/Shared': { kind: 'folder', isEntity: true },
      },
      entityConsumers: { 'src/App/Shared': ['src/App/A', 'src/App/B'] },
    });
    // LCA(A, B) = src/App; Shared is `src/App/Shared`, inside src/App's subtree.
    // Any cross-import in a flat tree routes to siblings-forbidden, never lca-placement.
    const v = analyzePlacement(g, cfg()).get('src/App/Shared');
    expect(v?.ruleId).not.toBe('lca-placement');
  });

  it('uses the source root as the LCA when consumers share no entity ancestor', () => {
    const g = makeGraph({
      nodes: {
        'src/A': { kind: 'folder', isEntity: true },
        'src/B': { kind: 'folder', isEntity: true },
        'src/Stray/Deep': { kind: 'folder', isEntity: true },
      },
      entityConsumers: { 'src/Stray/Deep': ['src/A', 'src/B'] },
    });
    // LCA(A, B) = null -> source root `src`; Deep is inside `src`, so it abstains.
    expect(analyzePlacement(g, cfg()).has('src/Stray/Deep')).toBe(false);
  });

  it('uses the explicit layer root as the LCA when consumers share no entity ancestor', () => {
    const g = makeGraph({
      nodes: {
        'src/App/A': { kind: 'folder', isEntity: true },
        'src/App/B': { kind: 'folder', isEntity: true },
        'src/App/Stray': { kind: 'folder', isEntity: true },
      },
      entityConsumers: { 'src/App/Stray': ['src/App/A', 'src/App/B'] },
    });
    const config = cfg({ layers: { App: { canImport: [] } } });
    // LCA(A, B) = null -> layer root `src/App`; Stray is inside it, so it abstains.
    expect(analyzePlacement(g, config).has('src/App/Stray')).toBe(false);
  });

  it('abstains for a single-consumer entity within the consumer parent subtree', () => {
    const g = makeGraph({
      nodes: {
        'src/App': { kind: 'folder', isEntity: true },
        'src/App/Header': { kind: 'folder', isEntity: true },
        'src/App/Header/Deep': { kind: 'folder', isEntity: true },
        'src/App/Header/Sub': { kind: 'folder', isEntity: true },
        'src/App/Header/Sub/Within': { kind: 'folder', isEntity: true },
      },
      entityConsumers: { 'src/App/Header/Sub/Within': ['src/App/Header/Deep'] },
    });
    // LCA([Deep]) = componentParentOf(Deep) = src/App/Header; Within lives inside it.
    // Within's component parent is Sub, Deep's is Header — not siblings.
    expect(analyzePlacement(g, cfg()).has('src/App/Header/Sub/Within')).toBe(false);
  });

  it('flags a single-consumer entity that is not inside the consumer parent subtree', () => {
    const g = makeGraph({
      nodes: {
        'src/App': { kind: 'folder', isEntity: true },
        'src/App/Header': { kind: 'folder', isEntity: true },
        'src/App/Header/Deep': { kind: 'folder', isEntity: true },
        'src/Other/Far': { kind: 'folder', isEntity: true },
      },
      entityConsumers: { 'src/Other/Far': ['src/App/Header/Deep'] },
    });
    const v = analyzePlacement(g, cfg()).get('src/Other/Far');
    expect(v?.ruleId).toBe('lca-placement');
    // LCA([Header/Deep]) = componentParentOf = src/App/Header; Far lives under src/Other.
    expect(v?.expected).toBe('src/App/Header');
  });
});

describe('analyzePlacement role-folder verdicts — branches 1-3', () => {
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
    expect(v?.expected).toBe('src/App/items/Leaked');
  });

  it('branch 1: a slots/ entity at its role-folder path emits no verdict', () => {
    const g = makeGraph({
      nodes: {
        'src/App': { kind: 'folder', isEntity: true },
        'src/App/Header': { kind: 'folder', isEntity: true },
        'src/App/Header/slots/Owned': { kind: 'folder', isEntity: true },
      },
      entityConsumers: { 'src/App/Header/slots/Owned': ['src/App/Header'] },
    });
    // n == 1, lone owner is Header -> roleFolderExpected = src/App/Header/slots/Owned == actual.
    expect(analyzePlacement(g, cfg()).has('src/App/Header/slots/Owned')).toBe(false);
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

  it('branch 2: an items/ entity with enough consumers emits no verdict', () => {
    const g = makeGraph({
      nodes: {
        'src/App': { kind: 'folder', isEntity: true },
        'src/App/Header': { kind: 'folder', isEntity: true },
        'src/App/Footer': { kind: 'folder', isEntity: true },
        'src/App/items/Card': { kind: 'folder', isEntity: true },
      },
      entityConsumers: { 'src/App/items/Card': ['src/App/Header', 'src/App/Footer'] },
    });
    // n >= promotionThreshold, roleFolderExpected = src/App/items/Card == actual.
    expect(analyzePlacement(g, cfg()).has('src/App/items/Card')).toBe(false);
  });

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
});

describe('analyzePlacement memoization', () => {
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
