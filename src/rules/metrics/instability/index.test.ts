/**
 * @fileoverview Tests for the instability metrics rule.
 */
import { describe, expect, it } from 'vitest';
import type { ResolvedConfig, UnitsConfig } from '#foundation/config/types.js';
import type { Edge } from '#platform/graph/types.js';
import { makeContext } from '#rules/test-support/make-context.js';
import { makeGraph } from '#rules/test-support/make-graph.js';
import { only } from '#rules/test-support/only.js';
import { instability } from './index.js';

function edge(consumer: string, producer: string): Edge {
  return { consumer, producer, symbol: 'x', typeOnly: false };
}

function cfg(units: UnitsConfig = {}): ResolvedConfig {
  return { project: { sourceRoot: 'src' }, units } as ResolvedConfig;
}

/** A graph where unit `graph` has Ce=1 and Ca=1 → I = 0.5. */
function balancedGraph() {
  return makeGraph({
    nodes: {
      'src/graph/a.ts': { kind: 'file' },
      'src/runner/cli.ts': { kind: 'file' },
      'src/report/b.ts': { kind: 'file' },
    },
    edges: [edge('src/runner/cli.ts', 'src/graph/a.ts'), edge('src/graph/a.ts', 'src/report/b.ts')],
  });
}

describe('instability — metadata', () => {
  it('has the canonical metadata', () => {
    expect(instability.id).toBe('instability');
    expect(instability.pack).toBe('metrics');
    expect(instability.engine).toBe('graph');
    expect(instability.defaultSeverity).toBe('info');
  });
});

describe('instability — check', () => {
  const units = { graph: 'graph/**', runner: 'runner/**', report: 'report/**' };

  it('returns nothing when leafUnits is empty', () => {
    const ctx = makeContext('instability', { severity: 'info', options: {} });
    expect(instability.check(balancedGraph(), cfg(units), ctx)).toEqual([]);
  });

  it('is inert when no units are declared', () => {
    const ctx = makeContext('instability', {
      severity: 'info',
      options: { maxForLeafUnits: 0.4, leafUnits: ['graph'] },
    });
    expect(instability.check(balancedGraph(), cfg(), ctx)).toEqual([]);
  });

  it('emits nothing for a leaf unit at or below the max', () => {
    const ctx = makeContext('instability', {
      severity: 'info',
      options: { maxForLeafUnits: 0.5, leafUnits: ['graph'] },
    });
    expect(instability.check(balancedGraph(), cfg(units), ctx)).toEqual([]);
  });

  it('flags an unstable leaf unit', () => {
    const ctx = makeContext('instability', {
      severity: 'info',
      options: { maxForLeafUnits: 0.4, leafUnits: ['graph'] },
    });
    const d = only(instability.check(balancedGraph(), cfg(units), ctx));
    expect(d.ruleId).toBe('instability');
    expect(d.entity).toBe('graph');
    expect(d.fingerprint).toBe('instability#graph');
    expect(d.message).toBe('unit graph is declared a leaf but is unstable');
    expect(d.expected).toBe('instability I ≤ 0.4');
    expect(d.actual).toBe('I = 0.50 (Ca=1, Ce=1)');
  });

  it('reports a degenerate leaf unit nothing depends on', () => {
    const graph = makeGraph({
      nodes: { 'src/graph/a.ts': { kind: 'file' }, 'src/report/b.ts': { kind: 'file' } },
      edges: [edge('src/graph/a.ts', 'src/report/b.ts')],
    });
    const ctx = makeContext('instability', {
      severity: 'info',
      options: { maxForLeafUnits: 0.4, leafUnits: ['graph'] },
    });
    const d = only(instability.check(graph, cfg(units), ctx));
    expect(d.ruleId).toBe('instability');
    expect(d.severity).toBe('info');
    expect(d.message).toBe('leaf unit graph has no inbound dependencies');
    expect(d.actual).toBe('Ca = 0 — nothing imports this unit');
  });
});
