/**
 * @fileoverview Tests for the lca-placement rule.
 */
import { describe, it, expect } from 'vitest';
import { lcaPlacementRule } from './index.js';
import { makeGraph } from '../test-support/make-graph.js';
import { makeContext } from '../test-support/make-context.js';
import type { ResolvedConfig } from '../../types.js';

function cfg(): ResolvedConfig {
  return {
    conventions: {
      privateSegment: 'slots', sharedSegment: 'items', libSegment: 'lib',
      hooksSegment: 'hooks', explicitClusterSegment: 'ui', modelSegment: 'model',
      indexFiles: ['index.ts', 'index.tsx'],
    },
    layers: {},
    rules: { 'lca-placement': { severity: 'warning', promotionThreshold: 2 } },
  } as unknown as ResolvedConfig;
}

describe('lcaPlacementRule', () => {
  it('has the canonical metadata', () => {
    expect(lcaPlacementRule.id).toBe('lca-placement');
    expect(lcaPlacementRule.pack).toBe('placement');
    expect(lcaPlacementRule.engine).toBe('structural');
    expect(lcaPlacementRule.defaultSeverity).toBe('warning');
  });

  it('emits a diagnostic for an lca-placement verdict', () => {
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
    const out = lcaPlacementRule.check(g, cfg(), makeContext('lca-placement'));
    expect(out).toHaveLength(1);
    expect(out[0]!.ruleId).toBe('lca-placement');
    expect(out[0]!.entity).toBe('src/App/Stray');
  });

  it('does not emit for a slots-privacy verdict', () => {
    const g = makeGraph({
      nodes: {
        'src/App': { kind: 'folder', isEntity: true },
        'src/App/Header': { kind: 'folder', isEntity: true },
        'src/App/Footer': { kind: 'folder', isEntity: true },
        'src/App/Header/slots/Leaked': { kind: 'folder', isEntity: true },
      },
      entityConsumers: { 'src/App/Header/slots/Leaked': ['src/App/Header', 'src/App/Footer'] },
    });
    expect(lcaPlacementRule.check(g, cfg(), makeContext('lca-placement'))).toEqual([]);
  });
});
