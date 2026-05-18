/**
 * @fileoverview Tests for unitOf and the unitCoupling graph fold.
 */
import { describe, expect, it } from 'vitest';
import type { UnitsConfig } from '#foundation/config/types.js';
import { makeGraph } from '#rules/test-support/make-graph.js';
import type { Edge } from './types.js';
import { unitCoupling, unitOf } from './unit-coupling.js';

function edge(consumer: string, producer: string, typeOnly = false): Edge {
  return { consumer, producer, symbol: 'x', typeOnly };
}

describe('unitOf — declared units', () => {
  const units: UnitsConfig = {
    'platform/graph': 'platform/graph/**',
    'rules/metrics': 'rules/metrics/**',
  };

  it('returns the declared unit a file belongs to', () => {
    expect(unitOf('src/platform/graph/build.ts', 'src', units)).toBe('platform/graph');
  });

  it('strips the sourceRoot prefix before matching', () => {
    expect(unitOf('src/rules/metrics/analyze.ts', 'src', units)).toBe('rules/metrics');
  });

  it('matches a file id that already lacks the sourceRoot prefix', () => {
    expect(unitOf('platform/graph/build.ts', 'src', units)).toBe('platform/graph');
  });

  it('returns null for a file matched by no glob', () => {
    expect(unitOf('src/public-api.ts', 'src', units)).toBeNull();
    expect(unitOf('src/runner/cli.ts', 'src', units)).toBeNull();
  });

  it('lets the most-specific glob win on overlap', () => {
    const overlap: UnitsConfig = { runner: 'runner/**', 'runner/baseline': 'runner/baseline/**' };
    expect(unitOf('src/runner/baseline/parse.ts', 'src', overlap)).toBe('runner/baseline');
    expect(unitOf('src/runner/check.ts', 'src', overlap)).toBe('runner');
  });

  it('breaks an equal-specificity tie by declaration order', () => {
    const tie: UnitsConfig = { first: 'platform/**', second: 'platform/**' };
    expect(unitOf('src/platform/graph/x.ts', 'src', tie)).toBe('first');
  });

  it('matches a unit declared with a list of globs', () => {
    const listed: UnitsConfig = { shared: ['foundation/config/**', 'foundation/types/**'] };
    expect(unitOf('src/foundation/types/t.ts', 'src', listed)).toBe('shared');
    expect(unitOf('src/foundation/config/c.ts', 'src', listed)).toBe('shared');
  });
});

describe('unitOf — positional fallback', () => {
  it('falls back to the first path segment when no units are declared', () => {
    expect(unitOf('src/platform/graph/build.ts', 'src', {})).toBe('platform');
  });

  it('returns null for a root-level file under the positional fallback', () => {
    expect(unitOf('src/public-api.ts', 'src', {})).toBeNull();
  });
});

describe('unitCoupling', () => {
  const units: UnitsConfig = {
    runner: 'runner/**',
    report: 'report/**',
    graph: 'graph/**',
  };

  it('folds Ca, Ce and the inbound/outbound unit sets', () => {
    const graph = makeGraph({
      nodes: {
        'src/runner/cli.ts': { kind: 'file' },
        'src/report/b.ts': { kind: 'file' },
        'src/graph/a.ts': { kind: 'file' },
      },
      edges: [
        edge('src/runner/cli.ts', 'src/graph/a.ts'),
        edge('src/report/b.ts', 'src/graph/a.ts'),
      ],
    });
    const coupling = unitCoupling(graph, 'src', units);
    expect(coupling.get('graph')?.ca).toBe(2);
    expect(coupling.get('graph')?.ce).toBe(0);
    expect([...(coupling.get('graph')?.inboundUnits ?? [])].sort()).toEqual(['report', 'runner']);
    expect(coupling.get('runner')?.ce).toBe(1);
  });

  it('counts inbound edges and their typeOnly subset', () => {
    const graph = makeGraph({
      nodes: {
        'src/runner/cli.ts': { kind: 'file' },
        'src/report/b.ts': { kind: 'file' },
        'src/graph/a.ts': { kind: 'file' },
      },
      edges: [
        edge('src/runner/cli.ts', 'src/graph/a.ts', true),
        edge('src/report/b.ts', 'src/graph/a.ts', false),
      ],
    });
    const m = unitCoupling(graph, 'src', units).get('graph');
    expect(m?.inboundEdges).toBe(2);
    expect(m?.inboundTypeOnlyEdges).toBe(1);
  });

  it('memoizes the fold per (graph, units, sourceRoot)', () => {
    const graph = makeGraph({ nodes: { 'src/graph/a.ts': { kind: 'file' } }, edges: [] });
    expect(unitCoupling(graph, 'src', units)).toBe(unitCoupling(graph, 'src', units));
  });

  it('folds positionally when no units are declared', () => {
    const graph = makeGraph({
      nodes: { 'src/graph/a.ts': { kind: 'file' }, 'src/runner/cli.ts': { kind: 'file' } },
      edges: [edge('src/runner/cli.ts', 'src/graph/a.ts')],
    });
    const coupling = unitCoupling(graph, 'src', {});
    expect([...coupling.keys()].sort()).toEqual(['graph', 'runner']);
  });
});
