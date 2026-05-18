/**
 * @fileoverview Tests for the afferent-coupling metrics rule.
 */
import { describe, expect, it } from 'vitest';
import type { ResolvedConfig, UnitsConfig } from '#foundation/config/types.js';
import type { Edge } from '#platform/graph/types.js';
import { makeContext } from '#rules/test-support/make-context.js';
import { makeGraph } from '#rules/test-support/make-graph.js';
import { only } from '#rules/test-support/only.js';
import { afferentCoupling } from './index.js';

function edge(consumer: string, producer: string): Edge {
  return { consumer, producer, symbol: 'x', typeOnly: false };
}

function cfg(units: UnitsConfig = {}): ResolvedConfig {
  return { project: { sourceRoot: 'src' }, units } as ResolvedConfig;
}

describe('afferentCoupling — metadata', () => {
  it('has the canonical metadata', () => {
    expect(afferentCoupling.id).toBe('afferent-coupling');
    expect(afferentCoupling.pack).toBe('metrics');
    expect(afferentCoupling.engine).toBe('graph');
    expect(afferentCoupling.defaultSeverity).toBe('info');
  });
});

describe('afferentCoupling — check', () => {
  it('is inert when no units are declared', () => {
    const graph = makeGraph({
      nodes: { 'src/runner/cli.ts': { kind: 'file' }, 'src/graph/a.ts': { kind: 'file' } },
      edges: [edge('src/runner/cli.ts', 'src/graph/a.ts')],
    });
    const ctx = makeContext('afferent-coupling', { severity: 'info', options: { max: 0 } });
    expect(afferentCoupling.check(graph, cfg(), ctx)).toEqual([]);
  });

  it('emits nothing at or below the max', () => {
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
    const ctx = makeContext('afferent-coupling', { severity: 'info', options: { max: 2 } });
    expect(
      afferentCoupling.check(
        graph,
        cfg({ graph: 'graph/**', runner: 'runner/**', report: 'report/**' }),
        ctx,
      ),
    ).toEqual([]);
  });

  it('flags a unit above the max', () => {
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
    const units = { graph: 'graph/**', runner: 'runner/**', report: 'report/**' };
    const ctx = makeContext('afferent-coupling', { severity: 'info', options: { max: 1 } });
    const d = only(afferentCoupling.check(graph, cfg(units), ctx));
    expect(d.ruleId).toBe('afferent-coupling');
    expect(d.entity).toBe('graph');
    expect(d.fingerprint).toBe('afferent-coupling#graph');
    expect(d.message).toBe('unit graph is depended on by many units');
    expect(d.expected).toBe('≤ 1 inbound unit dependencies');
    expect(d.actual).toBe('2 (report, runner)');
    expect(d.location).toEqual({ file: 'graph', line: 1, column: 1 });
  });

  it('defaults max to 6', () => {
    const nodes: Record<string, { kind: 'file' }> = { 'src/graph/a.ts': { kind: 'file' } };
    const edges: Edge[] = [];
    const units: Record<string, string> = { graph: 'graph/**' };
    for (const name of ['a', 'b', 'c', 'd', 'e', 'f', 'g']) {
      nodes[`src/${name}/x.ts`] = { kind: 'file' };
      edges.push(edge(`src/${name}/x.ts`, 'src/graph/a.ts'));
      units[name] = `${name}/**`;
    }
    const graph = makeGraph({ nodes, edges });
    const ctx = makeContext('afferent-coupling', { severity: 'info' });
    const d = only(afferentCoupling.check(graph, cfg(units), ctx));
    expect(d.actual).toBe('7 (a, b, c, d, e, f, g)');
  });
});
