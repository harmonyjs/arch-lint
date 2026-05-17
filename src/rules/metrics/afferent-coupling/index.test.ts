/**
 * @fileoverview Tests for the afferent-coupling metrics rule.
 */
import { describe, expect, it } from 'vitest';
import type { ResolvedConfig } from '../../../config/types.js';
import type { Edge } from '../../../graph/types.js';
import { makeContext } from '../../test-support/make-context.js';
import { makeGraph } from '../../test-support/make-graph.js';
import { afferentCoupling } from './index.js';

function edge(consumer: string, producer: string): Edge {
  return { consumer, producer, symbol: 'x', typeOnly: false };
}

function cfg(): ResolvedConfig {
  return { project: { sourceRoot: 'src' } } as ResolvedConfig;
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
    expect(afferentCoupling.check(graph, cfg(), ctx)).toEqual([]);
  });

  it('flags a subsystem above the max', () => {
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
    const ctx = makeContext('afferent-coupling', { severity: 'info', options: { max: 1 } });
    const out = afferentCoupling.check(graph, cfg(), ctx);
    expect(out).toHaveLength(1);
    expect(out[0]!.ruleId).toBe('afferent-coupling');
    expect(out[0]!.entity).toBe('src/graph');
    expect(out[0]!.fingerprint).toBe('afferent-coupling#graph');
    expect(out[0]!.message).toBe('subsystem graph is depended on by many subsystems');
    expect(out[0]!.expected).toBe('≤ 1 inbound subsystem dependencies');
    expect(out[0]!.actual).toBe('2 (report, runner)');
    expect(out[0]!.location).toEqual({ file: 'src/graph', line: 1, column: 1 });
  });

  it('defaults max to 6', () => {
    const nodes: Record<string, { kind: 'file' }> = { 'src/graph/a.ts': { kind: 'file' } };
    const edges: Edge[] = [];
    for (const name of ['a', 'b', 'c', 'd', 'e', 'f', 'g']) {
      nodes[`src/${name}/x.ts`] = { kind: 'file' };
      edges.push(edge(`src/${name}/x.ts`, 'src/graph/a.ts'));
    }
    const graph = makeGraph({ nodes, edges });
    const ctx = makeContext('afferent-coupling', { severity: 'info' });
    const out = afferentCoupling.check(graph, cfg(), ctx);
    expect(out).toHaveLength(1);
    expect(out[0]!.actual).toBe('7 (a, b, c, d, e, f, g)');
  });
});
