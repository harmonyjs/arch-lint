/**
 * @fileoverview Tests for the efferent-coupling metrics rule.
 */
import { describe, expect, it } from 'vitest';
import type { ResolvedConfig } from '../../../config/types.js';
import type { Edge } from '../../../graph/types.js';
import { makeContext } from '../../test-support/make-context.js';
import { makeGraph } from '../../test-support/make-graph.js';
import { only } from '../../test-support/only.js';
import { efferentCoupling } from './index.js';

function edge(consumer: string, producer: string): Edge {
  return { consumer, producer, symbol: 'x', typeOnly: false };
}

function cfg(): ResolvedConfig {
  return { project: { sourceRoot: 'src' } } as ResolvedConfig;
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
    expect(efferentCoupling.check(graph, cfg(), ctx)).toEqual([]);
  });

  it('flags a subsystem above the max', () => {
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
    const ctx = makeContext('efferent-coupling', { severity: 'warning', options: { max: 1 } });
    const d = only(efferentCoupling.check(graph, cfg(), ctx));
    expect(d.ruleId).toBe('efferent-coupling');
    expect(d.entity).toBe('src/runner');
    expect(d.fingerprint).toBe('efferent-coupling#runner');
    expect(d.message).toBe('subsystem runner depends on too many other subsystems');
    expect(d.expected).toBe('≤ 1 outbound subsystem dependencies');
    expect(d.actual).toBe('2 (graph, report)');
    expect(d.location).toEqual({ file: 'src/runner', line: 1, column: 1 });
  });

  it('skips a subsystem listed in allow', () => {
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
    const ctx = makeContext('efferent-coupling', {
      severity: 'warning',
      options: { max: 1, allow: ['runner'] },
    });
    expect(efferentCoupling.check(graph, cfg(), ctx)).toEqual([]);
  });

  it('defaults allow to empty — an unlisted subsystem is still flagged', () => {
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
    const ctx = makeContext('efferent-coupling', {
      severity: 'warning',
      options: { max: 1, allow: ['graph'] },
    });
    expect(efferentCoupling.check(graph, cfg(), ctx)).toHaveLength(1);
  });

  it('defaults max to 4', () => {
    const nodes: Record<string, { kind: 'file' }> = { 'src/runner/cli.ts': { kind: 'file' } };
    const edges: Edge[] = [];
    for (const name of ['a', 'b', 'c', 'd', 'e']) {
      nodes[`src/${name}/x.ts`] = { kind: 'file' };
      edges.push(edge('src/runner/cli.ts', `src/${name}/x.ts`));
    }
    const graph = makeGraph({ nodes, edges });
    const ctx = makeContext('efferent-coupling', { severity: 'warning' });
    const d = only(efferentCoupling.check(graph, cfg(), ctx));
    expect(d.actual).toBe('5 (a, b, c, d, e)');
  });
});
