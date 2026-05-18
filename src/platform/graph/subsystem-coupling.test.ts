/**
 * @fileoverview Tests for the subsystem-coupling helper — subsystemOf and subsystemCoupling.
 */
import { describe, expect, it } from 'vitest';
import type { LayersConfig } from '#foundation/config/types.js';
import { makeGraph } from '#rules/test-support/make-graph.js';
import { subsystemCoupling, subsystemOf } from './subsystem-coupling.js';
import type { Edge } from './types.js';

function edge(consumer: string, producer: string): Edge {
  return { consumer, producer, symbol: 'x', typeOnly: false };
}

/** The arch-lint layer set, used to exercise the layer-aware branch. */
const LAYERS: LayersConfig = {
  foundation: { canImport: [] },
  platform: { canImport: ['foundation'] },
  rules: { canImport: ['foundation', 'platform'] },
  report: { canImport: ['foundation', 'platform', 'rules'] },
  runner: { canImport: ['foundation', 'platform', 'rules', 'report'] },
};

describe('subsystemOf', () => {
  it('takes the first path segment after the source root', () => {
    expect(subsystemOf('src/graph/edges.ts', 'src')).toBe('graph');
  });
  it('treats a top-level rules pack as the rules subsystem', () => {
    expect(subsystemOf('src/rules/layers/layer-boundary/index.ts', 'src')).toBe('rules');
  });
  it('returns null for a root-level file', () => {
    expect(subsystemOf('src/types.ts', 'src')).toBeNull();
  });

  it('descends one level when the first segment is a declared layer', () => {
    expect(subsystemOf('src/foundation/config/types.ts', 'src', LAYERS)).toBe('foundation/config');
  });
  it('returns just the layer name for a file directly in a layer root', () => {
    expect(subsystemOf('src/runner/check.ts', 'src', LAYERS)).toBe('runner');
  });
  it('still takes the first segment when it is not a declared layer', () => {
    expect(subsystemOf('src/widgets/button.ts', 'src', LAYERS)).toBe('widgets');
  });
  it('behaves like the first-segment fallback when layers is empty', () => {
    expect(subsystemOf('src/foundation/config/types.ts', 'src', {})).toBe('foundation');
  });
  it('returns null for a root-level file even with layers declared', () => {
    expect(subsystemOf('src/public-api.ts', 'src', LAYERS)).toBeNull();
  });
});

describe('subsystemCoupling', () => {
  it('counts distinct cross-subsystem dependencies for Ce and Ca', () => {
    const graph = makeGraph({
      nodes: {
        'src/runner/cli.ts': { kind: 'file' },
        'src/graph/build.ts': { kind: 'file' },
        'src/report/format.ts': { kind: 'file' },
      },
      edges: [
        edge('src/runner/cli.ts', 'src/graph/build.ts'),
        edge('src/runner/cli.ts', 'src/report/format.ts'),
      ],
    });
    const c = subsystemCoupling(graph, 'src');
    expect(c.get('runner')?.ce).toBe(2);
    expect(c.get('runner')?.ca).toBe(0);
    expect(c.get('graph')?.ca).toBe(1);
    expect(c.get('graph')?.ce).toBe(0);
  });
  it('ignores intra-subsystem edges', () => {
    const graph = makeGraph({
      nodes: { 'src/graph/a.ts': { kind: 'file' }, 'src/graph/b.ts': { kind: 'file' } },
      edges: [edge('src/graph/a.ts', 'src/graph/b.ts')],
    });
    const c = subsystemCoupling(graph, 'src');
    expect(c.get('graph')?.ce).toBe(0);
    expect(c.get('graph')?.ca).toBe(0);
  });
  it('does not double-count two edges into the same producer subsystem', () => {
    const graph = makeGraph({
      nodes: {
        'src/runner/cli.ts': { kind: 'file' },
        'src/runner/run.ts': { kind: 'file' },
        'src/graph/a.ts': { kind: 'file' },
        'src/graph/b.ts': { kind: 'file' },
      },
      edges: [
        edge('src/runner/cli.ts', 'src/graph/a.ts'),
        edge('src/runner/run.ts', 'src/graph/b.ts'),
      ],
    });
    expect(subsystemCoupling(graph, 'src').get('runner')?.ce).toBe(1);
  });
  it('records file membership and the inbound-subsystem set per subsystem', () => {
    const graph = makeGraph({
      nodes: { 'src/runner/cli.ts': { kind: 'file' }, 'src/graph/a.ts': { kind: 'file' } },
      edges: [edge('src/runner/cli.ts', 'src/graph/a.ts')],
    });
    const c = subsystemCoupling(graph, 'src');
    expect([...(c.get('graph')?.files ?? [])]).toEqual(['src/graph/a.ts']);
    expect([...(c.get('graph')?.inboundSubsystems ?? [])]).toEqual(['runner']);
  });

  it('does not register a root-level file as a subsystem', () => {
    const graph = makeGraph({
      nodes: { 'src/types.ts': { kind: 'file' }, 'src/graph/a.ts': { kind: 'file' } },
      edges: [],
    });
    const c = subsystemCoupling(graph, 'src');
    expect(c.has('types.ts')).toBe(false);
    expect(c.has('graph')).toBe(true);
  });

  it('does not count an edge whose consumer is a root-level file', () => {
    const graph = makeGraph({
      nodes: { 'src/types.ts': { kind: 'file' }, 'src/graph/a.ts': { kind: 'file' } },
      edges: [edge('src/types.ts', 'src/graph/a.ts')],
    });
    const c = subsystemCoupling(graph, 'src');
    expect(c.get('graph')?.ca).toBe(0);
  });

  it('does not count an edge whose producer is a root-level file', () => {
    const graph = makeGraph({
      nodes: { 'src/types.ts': { kind: 'file' }, 'src/graph/a.ts': { kind: 'file' } },
      edges: [edge('src/graph/a.ts', 'src/types.ts')],
    });
    const c = subsystemCoupling(graph, 'src');
    expect(c.get('graph')?.ce).toBe(0);
  });

  it('memoizes the fold per (graph, root) — repeated calls return the same object', () => {
    const graph = makeGraph({
      nodes: { 'src/runner/cli.ts': { kind: 'file' }, 'src/graph/a.ts': { kind: 'file' } },
      edges: [edge('src/runner/cli.ts', 'src/graph/a.ts')],
    });
    expect(subsystemCoupling(graph, 'src')).toBe(subsystemCoupling(graph, 'src'));
  });

  it('folds layer-qualified subsystems when layers are declared', () => {
    const graph = makeGraph({
      nodes: {
        'src/rules/metrics/analyze.ts': { kind: 'file' },
        'src/platform/graph/build.ts': { kind: 'file' },
      },
      edges: [edge('src/rules/metrics/analyze.ts', 'src/platform/graph/build.ts')],
    });
    const c = subsystemCoupling(graph, 'src', LAYERS);
    expect(c.get('rules/metrics')?.ce).toBe(1);
    expect(c.get('platform/graph')?.ca).toBe(1);
  });
});
