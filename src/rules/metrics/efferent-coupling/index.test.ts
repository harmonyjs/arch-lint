/**
 * @fileoverview Tests for the efferent-coupling metrics rule.
 */
import { describe, expect, it } from 'vitest';
import type { ResolvedConfig, UnitsConfig } from '#foundation/config/types.js';
import type { Edge } from '#platform/graph/types.js';
import { makeContext } from '#rules/test-support/make-context.js';
import { makeGraph } from '#rules/test-support/make-graph.js';
import { only } from '#rules/test-support/only.js';
import { efferentCoupling } from './index.js';

function edge(consumer: string, producer: string): Edge {
  return { consumer, producer, symbol: 'x', typeOnly: false };
}

function cfg(units: UnitsConfig = {}): ResolvedConfig {
  return { project: { sourceRoot: 'src' }, units } as ResolvedConfig;
}

describe('efferentCoupling — metadata', () => {
  it('has the canonical metadata', () => {
    expect(efferentCoupling.id).toBe('efferent-coupling');
    expect(efferentCoupling.pack).toBe('metrics');
    expect(efferentCoupling.engine).toBe('graph');
    expect(efferentCoupling.defaultSeverity).toBe('warning');
  });
});

describe('efferentCoupling — check', () => {
  it('is inert when no units are declared', () => {
    const graph = makeGraph({
      nodes: { 'src/runner/cli.ts': { kind: 'file' }, 'src/graph/a.ts': { kind: 'file' } },
      edges: [edge('src/runner/cli.ts', 'src/graph/a.ts')],
    });
    const ctx = makeContext('efferent-coupling', { severity: 'warning', options: { max: 0 } });
    expect(efferentCoupling.check(graph, cfg(), ctx)).toEqual([]);
  });

  it('emits nothing at or below the max', () => {
    const graph = makeGraph({
      nodes: {
        'src/runner/cli.ts': { kind: 'file' },
        'src/graph/a.ts': { kind: 'file' },
        'src/report/b.ts': { kind: 'file' },
      },
      edges: [
        edge('src/runner/cli.ts', 'src/graph/a.ts'),
        edge('src/runner/cli.ts', 'src/report/b.ts'),
      ],
    });
    const ctx = makeContext('efferent-coupling', { severity: 'warning', options: { max: 2 } });
    expect(
      efferentCoupling.check(
        graph,
        cfg({ runner: 'runner/**', graph: 'graph/**', report: 'report/**' }),
        ctx,
      ),
    ).toEqual([]);
  });

  it('flags a unit above the max', () => {
    const graph = makeGraph({
      nodes: {
        'src/runner/cli.ts': { kind: 'file' },
        'src/graph/a.ts': { kind: 'file' },
        'src/report/b.ts': { kind: 'file' },
      },
      edges: [
        edge('src/runner/cli.ts', 'src/graph/a.ts'),
        edge('src/runner/cli.ts', 'src/report/b.ts'),
      ],
    });
    const units = { runner: 'runner/**', graph: 'graph/**', report: 'report/**' };
    const ctx = makeContext('efferent-coupling', { severity: 'warning', options: { max: 1 } });
    const d = only(efferentCoupling.check(graph, cfg(units), ctx));
    expect(d.ruleId).toBe('efferent-coupling');
    expect(d.entity).toBe('runner');
    expect(d.fingerprint).toBe('efferent-coupling#runner');
    expect(d.message).toBe('unit runner depends on too many other units');
    expect(d.expected).toBe('≤ 1 outbound unit dependencies');
    expect(d.actual).toBe('2 (graph, report)');
    expect(d.location).toEqual({ file: 'runner', line: 1, column: 1 });
  });

  it('skips a unit listed in allow', () => {
    const graph = makeGraph({
      nodes: {
        'src/runner/cli.ts': { kind: 'file' },
        'src/graph/a.ts': { kind: 'file' },
        'src/report/b.ts': { kind: 'file' },
      },
      edges: [
        edge('src/runner/cli.ts', 'src/graph/a.ts'),
        edge('src/runner/cli.ts', 'src/report/b.ts'),
      ],
    });
    const units = { runner: 'runner/**', graph: 'graph/**', report: 'report/**' };
    const ctx = makeContext('efferent-coupling', {
      severity: 'warning',
      options: { max: 1, allow: ['runner'] },
    });
    expect(efferentCoupling.check(graph, cfg(units), ctx)).toEqual([]);
  });

  it('defaults allow to empty — an unlisted unit is still flagged', () => {
    const graph = makeGraph({
      nodes: {
        'src/runner/cli.ts': { kind: 'file' },
        'src/graph/a.ts': { kind: 'file' },
        'src/report/b.ts': { kind: 'file' },
      },
      edges: [
        edge('src/runner/cli.ts', 'src/graph/a.ts'),
        edge('src/runner/cli.ts', 'src/report/b.ts'),
      ],
    });
    const units = { runner: 'runner/**', graph: 'graph/**', report: 'report/**' };
    const ctx = makeContext('efferent-coupling', {
      severity: 'warning',
      options: { max: 1, allow: ['graph'] },
    });
    expect(efferentCoupling.check(graph, cfg(units), ctx)).toHaveLength(1);
  });

  it('defaults max to 4', () => {
    const nodes: Record<string, { kind: 'file' }> = { 'src/runner/cli.ts': { kind: 'file' } };
    const edges: Edge[] = [];
    const units: Record<string, string> = { runner: 'runner/**' };
    for (const name of ['a', 'b', 'c', 'd', 'e']) {
      nodes[`src/${name}/x.ts`] = { kind: 'file' };
      edges.push(edge('src/runner/cli.ts', `src/${name}/x.ts`));
      units[name] = `${name}/**`;
    }
    const graph = makeGraph({ nodes, edges });
    const ctx = makeContext('efferent-coupling', { severity: 'warning' });
    const d = only(efferentCoupling.check(graph, cfg(units), ctx));
    expect(d.actual).toBe('5 (a, b, c, d, e)');
  });
});
