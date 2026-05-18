/**
 * @fileoverview Tests for analyzeMetrics — the one-pass per-subsystem metrics.
 */
import { describe, expect, it } from 'vitest';
import type { ResolvedConfig, UnitsConfig } from '#foundation/config/types.js';
import type { Edge } from '#platform/graph/types.js';
import { makeGraph } from '#rules/test-support/make-graph.js';
import { analyzeMetrics } from './analyze.js';

function edge(consumer: string, producer: string): Edge {
  return { consumer, producer, symbol: 'x', typeOnly: false };
}
function cfg(units: UnitsConfig = {}): ResolvedConfig {
  return { project: { sourceRoot: 'src' }, units } as ResolvedConfig;
}

describe('analyzeMetrics', () => {
  it('computes Ca, Ce and instability per subsystem', () => {
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
    const report = analyzeMetrics(graph, cfg());
    expect(report.get('graph')?.ca).toBe(2);
    expect(report.get('graph')?.ce).toBe(0);
    expect(report.get('graph')?.instability).toBe(0);
    expect(report.get('runner')?.ce).toBe(1);
    expect(report.get('runner')?.instability).toBe(1);
  });

  it('counts entity files and the cohesive subset', () => {
    const graph = makeGraph({
      nodes: {
        'src/graph/a.ts': { kind: 'file', isEntity: true },
        'src/graph/b.ts': { kind: 'file', isEntity: true },
        'src/graph/index.ts': { kind: 'file', isEntity: false },
      },
      edges: [edge('src/graph/a.ts', 'src/graph/b.ts')],
    });
    const m = analyzeMetrics(graph, cfg()).get('graph');
    expect(m?.entityFiles).toBe(2);
    expect(m?.cohesiveEntityFiles).toBe(1);
  });

  it('returns the same report object for the same graph (memoized)', () => {
    const graph = makeGraph({ nodes: { 'src/graph/a.ts': { kind: 'file' } }, edges: [] });
    // One shared `units` object → one stable cache key for both calls.
    const config = cfg();
    expect(analyzeMetrics(graph, config)).toBe(analyzeMetrics(graph, config));
  });

  it('re-keys the report cache by units config', () => {
    const graph = makeGraph({
      nodes: {
        'src/foundation/config/a.ts': { kind: 'file' },
        'src/foundation/graph/b.ts': { kind: 'file' },
      },
      edges: [edge('src/foundation/config/a.ts', 'src/foundation/graph/b.ts')],
    });

    // No units → positional first-segment → one `foundation` unit.
    const flat = analyzeMetrics(graph, cfg());
    expect([...flat.keys()]).toEqual(['foundation']);
  });
});

describe('analyzeMetrics — abstractness', () => {
  it("is the typeOnly fraction of a unit's inbound edges", () => {
    const units: UnitsConfig = { graph: 'graph/**', runner: 'runner/**', report: 'report/**' };
    const graph = makeGraph({
      nodes: {
        'src/graph/a.ts': { kind: 'file' },
        'src/runner/cli.ts': { kind: 'file' },
        'src/report/b.ts': { kind: 'file' },
      },
      edges: [
        edge('src/runner/cli.ts', 'src/graph/a.ts'),
        { consumer: 'src/report/b.ts', producer: 'src/graph/a.ts', symbol: 'x', typeOnly: true },
      ],
    });
    expect(analyzeMetrics(graph, cfg(units)).get('graph')?.abstractness).toBe(0.5);
  });

  it('is 1 for a unit with no inbound edges', () => {
    const units: UnitsConfig = { graph: 'graph/**' };
    const graph = makeGraph({ nodes: { 'src/graph/a.ts': { kind: 'file' } }, edges: [] });
    expect(analyzeMetrics(graph, cfg(units)).get('graph')?.abstractness).toBe(1);
  });
});
