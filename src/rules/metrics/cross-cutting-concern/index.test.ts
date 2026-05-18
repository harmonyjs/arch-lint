/**
 * @fileoverview Tests for the cross-cutting-concern metrics rule.
 */
import { describe, expect, it } from 'vitest';
import type { ResolvedConfig } from '#foundation/config/types.js';
import type { Edge } from '#platform/graph/types.js';
import { makeContext } from '#rules/test-support/make-context.js';
import { makeGraph } from '#rules/test-support/make-graph.js';
import { only } from '#rules/test-support/only.js';
import { crossCuttingConcern } from './index.js';

function edge(consumer: string, producer: string): Edge {
  return { consumer, producer, symbol: 'x', typeOnly: false };
}

function cfg(): ResolvedConfig {
  return { project: { sourceRoot: 'src' } } as ResolvedConfig;
}

/** A graph where `src/types.ts` is imported from N distinct other subsystems. */
function fanInGraph(subsystems: readonly string[]) {
  const nodes: Record<string, { kind: 'file' }> = { 'src/types.ts': { kind: 'file' } };
  const edges: Edge[] = [];
  for (const name of subsystems) {
    nodes[`src/${name}/x.ts`] = { kind: 'file' };
    edges.push(edge(`src/${name}/x.ts`, 'src/types.ts'));
  }
  return makeGraph({ nodes, edges });
}

describe('crossCuttingConcern — metadata', () => {
  it('has the canonical metadata', () => {
    expect(crossCuttingConcern.id).toBe('cross-cutting-concern');
    expect(crossCuttingConcern.pack).toBe('metrics');
    expect(crossCuttingConcern.engine).toBe('graph');
    expect(crossCuttingConcern.defaultSeverity).toBe('info');
  });
});

describe('crossCuttingConcern — check', () => {
  it('emits nothing below the maxSubsystems threshold', () => {
    const graph = fanInGraph(['a', 'b']);
    const ctx = makeContext('cross-cutting-concern', {
      severity: 'info',
      options: { maxSubsystems: 3 },
    });
    expect(crossCuttingConcern.check(graph, cfg(), ctx)).toEqual([]);
  });

  it('flags a file imported from many subsystems', () => {
    const graph = fanInGraph(['a', 'b', 'c']);
    const ctx = makeContext('cross-cutting-concern', {
      severity: 'info',
      options: { maxSubsystems: 3 },
    });
    const d = only(crossCuttingConcern.check(graph, cfg(), ctx));
    expect(d.ruleId).toBe('cross-cutting-concern');
    expect(d.entity).toBe('src/types.ts');
    expect(d.fingerprint).toBe('cross-cutting-concern#src/types.ts');
    expect(d.message).toBe('src/types.ts is imported across many subsystems');
    expect(d.actual).toBe('3 subsystems (a, b, c)');
    expect(d.location).toEqual({ file: 'src/types.ts', line: 1, column: 1 });
  });

  it('skips a file listed in allow', () => {
    const graph = fanInGraph(['a', 'b', 'c']);
    const ctx = makeContext('cross-cutting-concern', {
      severity: 'info',
      options: { maxSubsystems: 3, allow: ['src/types.ts'] },
    });
    expect(crossCuttingConcern.check(graph, cfg(), ctx)).toEqual([]);
  });

  it('does not count a root-level file as an importing subsystem', () => {
    const graph = makeGraph({
      nodes: {
        'src/types.ts': { kind: 'file' },
        'src/errors.ts': { kind: 'file' },
        'src/a/x.ts': { kind: 'file' },
        'src/b/x.ts': { kind: 'file' },
        'src/c/x.ts': { kind: 'file' },
      },
      edges: [
        edge('src/errors.ts', 'src/types.ts'),
        edge('src/a/x.ts', 'src/types.ts'),
        edge('src/b/x.ts', 'src/types.ts'),
        edge('src/c/x.ts', 'src/types.ts'),
      ],
    });
    const ctx = makeContext('cross-cutting-concern', {
      severity: 'info',
      options: { maxSubsystems: 3 },
    });
    const d = only(crossCuttingConcern.check(graph, cfg(), ctx));
    expect(d.actual).toBe('3 subsystems (a, b, c)');
  });

  it('still measures a root-level file imported across many subsystems', () => {
    const graph = makeGraph({
      nodes: {
        'src/errors.ts': { kind: 'file' },
        'src/a/x.ts': { kind: 'file' },
        'src/b/x.ts': { kind: 'file' },
        'src/c/x.ts': { kind: 'file' },
      },
      edges: [
        edge('src/a/x.ts', 'src/errors.ts'),
        edge('src/b/x.ts', 'src/errors.ts'),
        edge('src/c/x.ts', 'src/errors.ts'),
      ],
    });
    const ctx = makeContext('cross-cutting-concern', {
      severity: 'info',
      options: { maxSubsystems: 3 },
    });
    const d = only(crossCuttingConcern.check(graph, cfg(), ctx));
    expect(d.entity).toBe('src/errors.ts');
    expect(d.actual).toBe('3 subsystems (a, b, c)');
  });

  it('defaults maxSubsystems to 5', () => {
    const ctx = makeContext('cross-cutting-concern', { severity: 'info' });
    expect(crossCuttingConcern.check(fanInGraph(['a', 'b', 'c', 'd']), cfg(), ctx)).toEqual([]);
    const d = only(crossCuttingConcern.check(fanInGraph(['a', 'b', 'c', 'd', 'e']), cfg(), ctx));
    expect(d.actual).toBe('5 subsystems (a, b, c, d, e)');
  });
});
