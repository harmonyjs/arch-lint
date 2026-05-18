/**
 * @fileoverview Tests for the unit-cohesion metrics rule.
 */
import { describe, expect, it } from 'vitest';
import type { ResolvedConfig, UnitsConfig } from '#foundation/config/types.js';
import type { Edge } from '#platform/graph/types.js';
import { makeContext } from '#rules/test-support/make-context.js';
import { makeGraph } from '#rules/test-support/make-graph.js';
import { only } from '#rules/test-support/only.js';
import { unitCohesion } from './index.js';

function edge(consumer: string, producer: string): Edge {
  return { consumer, producer, symbol: 'x', typeOnly: false };
}

function cfg(units: UnitsConfig = {}): ResolvedConfig {
  return { project: { sourceRoot: 'src' }, units } as ResolvedConfig;
}

describe('unitCohesion — metadata', () => {
  it('has the canonical metadata', () => {
    expect(unitCohesion.id).toBe('unit-cohesion');
    expect(unitCohesion.pack).toBe('metrics');
    expect(unitCohesion.engine).toBe('graph');
    expect(unitCohesion.defaultSeverity).toBe('warning');
  });
});

describe('unitCohesion — check', () => {
  it('is inert when no units are declared', () => {
    const graph = makeGraph({
      nodes: {
        'src/graph/a.ts': { kind: 'file', isEntity: true },
        'src/graph/b.ts': { kind: 'file', isEntity: true },
        'src/graph/c.ts': { kind: 'file', isEntity: true },
        'src/graph/d.ts': { kind: 'file', isEntity: true },
      },
      edges: [edge('src/graph/a.ts', 'src/graph/b.ts')],
    });
    const ctx = makeContext('unit-cohesion', { severity: 'warning', options: { min: 0.5 } });
    expect(unitCohesion.check(graph, cfg(), ctx)).toEqual([]);
  });

  it('skips units with fewer than two entity files', () => {
    const graph = makeGraph({
      nodes: { 'src/graph/a.ts': { kind: 'file', isEntity: true } },
      edges: [],
    });
    const ctx = makeContext('unit-cohesion', { severity: 'warning', options: {} });
    expect(unitCohesion.check(graph, cfg({ graph: 'graph/**' }), ctx)).toEqual([]);
  });

  it('emits nothing at or above the min cohesion', () => {
    const graph = makeGraph({
      nodes: {
        'src/graph/a.ts': { kind: 'file', isEntity: true },
        'src/graph/b.ts': { kind: 'file', isEntity: true },
      },
      edges: [edge('src/graph/a.ts', 'src/graph/b.ts')],
    });
    const ctx = makeContext('unit-cohesion', { severity: 'warning', options: { min: 0.5 } });
    expect(unitCohesion.check(graph, cfg({ graph: 'graph/**' }), ctx)).toEqual([]);
  });

  it('flags a unit below the min cohesion', () => {
    const graph = makeGraph({
      nodes: {
        'src/graph/a.ts': { kind: 'file', isEntity: true },
        'src/graph/b.ts': { kind: 'file', isEntity: true },
        'src/graph/c.ts': { kind: 'file', isEntity: true },
        'src/graph/d.ts': { kind: 'file', isEntity: true },
      },
      edges: [edge('src/graph/a.ts', 'src/graph/b.ts')],
    });
    const ctx = makeContext('unit-cohesion', { severity: 'warning', options: { min: 0.5 } });
    const d = only(unitCohesion.check(graph, cfg({ graph: 'graph/**' }), ctx));
    expect(d.ruleId).toBe('unit-cohesion');
    expect(d.entity).toBe('graph');
    expect(d.fingerprint).toBe('unit-cohesion#graph');
    expect(d.message).toBe('unit graph has low internal cohesion');
    expect(d.expected).toBe('cohesion ≥ 0.5');
    expect(d.actual).toBe('0.25 (1/4 files import a sibling)');
  });

  it('excludes non-entity files from numerator and denominator', () => {
    const graph = makeGraph({
      nodes: {
        'src/graph/a.ts': { kind: 'file', isEntity: true },
        'src/graph/b.ts': { kind: 'file', isEntity: true },
        'src/graph/index.ts': { kind: 'file', isEntity: false },
        'src/graph/types.ts': { kind: 'file', isEntity: false },
      },
      edges: [edge('src/graph/a.ts', 'src/graph/b.ts')],
    });
    const ctx = makeContext('unit-cohesion', { severity: 'warning', options: { min: 0.5 } });
    // Only a.ts and b.ts count; a.ts imports a sibling → 1/2 = 0.5, at the min, no flag.
    expect(unitCohesion.check(graph, cfg({ graph: 'graph/**' }), ctx)).toEqual([]);
  });

  it('skips a unit with fewer than two entity files even when it has many barrels', () => {
    const graph = makeGraph({
      nodes: {
        'src/graph/a.ts': { kind: 'file', isEntity: true },
        'src/graph/index.ts': { kind: 'file', isEntity: false },
        'src/graph/extra.ts': { kind: 'file', isEntity: false },
      },
      edges: [],
    });
    const ctx = makeContext('unit-cohesion', { severity: 'warning', options: { min: 0.5 } });
    expect(unitCohesion.check(graph, cfg({ graph: 'graph/**' }), ctx)).toEqual([]);
  });

  it('respects the ignoreUnits list', () => {
    const graph = makeGraph({
      nodes: {
        'src/graph/a.ts': { kind: 'file', isEntity: true },
        'src/graph/b.ts': { kind: 'file', isEntity: true },
        'src/graph/c.ts': { kind: 'file', isEntity: true },
        'src/graph/d.ts': { kind: 'file', isEntity: true },
      },
      edges: [edge('src/graph/a.ts', 'src/graph/b.ts')],
    });
    const ctx = makeContext('unit-cohesion', {
      severity: 'warning',
      options: { min: 0.5, ignoreUnits: ['graph'] },
    });
    expect(unitCohesion.check(graph, cfg({ graph: 'graph/**' }), ctx)).toEqual([]);
  });
});
