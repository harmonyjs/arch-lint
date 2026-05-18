/**
 * @fileoverview Tests for the layer-boundary rule. Layer keys are written
 * relative to the sourceRoot — the production convention — while graph edge
 * ids carry the sourceRoot prefix; layerOf bridges the two.
 */
import { describe, expect, it } from 'vitest';
import type { ResolvedConfig } from '#foundation/config/types.js';
import type { Edge } from '#platform/graph/types.js';
import { makeContext } from '#rules/test-support/make-context.js';
import { makeGraph } from '#rules/test-support/make-graph.js';
import { only } from '#rules/test-support/only.js';
import { layerBoundaryRule } from './index.js';

function cfg(layers: ResolvedConfig['layers']): ResolvedConfig {
  return { layers, project: { sourceRoot: 'src' } } as ResolvedConfig;
}

const ctx = makeContext('layer-boundary', { severity: 'error' });

describe('layerBoundaryRule', () => {
  it('has the canonical metadata', () => {
    expect(layerBoundaryRule.id).toBe('layer-boundary');
    expect(layerBoundaryRule.pack).toBe('layers');
    expect(layerBoundaryRule.engine).toBe('graph');
    expect(layerBoundaryRule.defaultSeverity).toBe('error');
  });

  it('emits nothing when an edge respects canImport', () => {
    const edge: Edge = {
      consumer: 'src/App/App.tsx',
      producer: 'src/lib/util.ts',
      symbol: 'util',
      typeOnly: false,
    };
    const g = makeGraph({ edges: [edge] });
    const config = cfg({ App: { canImport: ['lib'] }, lib: { canImport: [] } });
    expect(layerBoundaryRule.check(g, config, ctx)).toEqual([]);
  });

  it('emits nothing when consumer or producer is outside every layer', () => {
    const edge: Edge = {
      consumer: 'src/free/a.ts',
      producer: 'src/free/b.ts',
      symbol: 'x',
      typeOnly: false,
    };
    const g = makeGraph({ edges: [edge] });
    expect(layerBoundaryRule.check(g, cfg({ App: { canImport: [] } }), ctx)).toEqual([]);
  });

  it('emits nothing for an intra-layer edge', () => {
    const edge: Edge = {
      consumer: 'src/App/a.ts',
      producer: 'src/App/b.ts',
      symbol: 'x',
      typeOnly: false,
    };
    const g = makeGraph({ edges: [edge] });
    expect(layerBoundaryRule.check(g, cfg({ App: { canImport: [] } }), ctx)).toEqual([]);
  });
});

describe('layerBoundaryRule violations', () => {
  it('emits a diagnostic with a consumer#producer fingerprint for a forbidden edge', () => {
    const edge: Edge = {
      consumer: 'src/App/App.tsx',
      producer: 'src/api/client.ts',
      symbol: 'fetch',
      typeOnly: false,
    };
    const g = makeGraph({ edges: [edge] });
    const config = cfg({ App: { canImport: [] }, api: { canImport: [] } });
    const out = layerBoundaryRule.check(g, config, ctx);
    const d = only(out);
    expect(d.ruleId).toBe('layer-boundary');
    expect(d.fingerprint).toBe('src/App/App.tsx#src/api/client.ts');
    expect(d.entity).toBe('src/App/App.tsx');
    expect(d.location.file).toBe('src/App/App.tsx');
  });

  it('deduplicates by fingerprint when two symbols cross the same file boundary', () => {
    const e1: Edge = {
      consumer: 'src/App/App.tsx',
      producer: 'src/api/client.ts',
      symbol: 'fetch',
      typeOnly: false,
    };
    const e2: Edge = {
      consumer: 'src/App/App.tsx',
      producer: 'src/api/client.ts',
      symbol: 'post',
      typeOnly: false,
    };
    const g = makeGraph({ edges: [e1, e2] });
    const config = cfg({ App: { canImport: [] }, api: { canImport: [] } });
    expect(layerBoundaryRule.check(g, config, ctx)).toHaveLength(1);
  });
});

describe('layerBoundaryRule sideEffectOnly', () => {
  it('allows a bindingless edge into a sideEffectOnly target', () => {
    const edge: Edge = {
      consumer: 'src/main.tsx',
      producer: 'src/tokens/reset.ts',
      symbol: '',
      typeOnly: false,
    };
    const g = makeGraph({ edges: [edge] });
    const config = cfg({
      'main.tsx': { canImport: ['tokens'], sideEffectOnly: ['tokens'] },
      tokens: { canImport: [] },
    });
    expect(layerBoundaryRule.check(g, config, ctx)).toEqual([]);
  });

  it('flags a bound import from a sideEffectOnly target', () => {
    const edge: Edge = {
      consumer: 'src/main.tsx',
      producer: 'src/tokens/reset.ts',
      symbol: 'theme',
      typeOnly: false,
    };
    const g = makeGraph({ edges: [edge] });
    const config = cfg({
      'main.tsx': { canImport: ['tokens'], sideEffectOnly: ['tokens'] },
      tokens: { canImport: [] },
    });
    const out = layerBoundaryRule.check(g, config, ctx);
    expect(only(out).reason).toContain('side-effect');
  });

  it('throws a config error when sideEffectOnly is not a subset of canImport', () => {
    const edge: Edge = {
      consumer: 'src/main.tsx',
      producer: 'src/api/x.ts',
      symbol: '',
      typeOnly: false,
    };
    const g = makeGraph({ edges: [edge] });
    const config = cfg({
      'main.tsx': { canImport: ['tokens'], sideEffectOnly: ['api'] },
      api: { canImport: [] },
    });
    expect(() => layerBoundaryRule.check(g, config, ctx)).toThrow(/sideEffectOnly/);
  });
});
