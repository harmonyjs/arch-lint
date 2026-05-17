/**
 * @fileoverview Tests for the instability metrics rule.
 */
import { describe, expect, it } from 'vitest';
import type { ResolvedConfig } from '#config/types.js';
import type { Edge } from '#graph/types.js';
import { makeContext } from '#rules/test-support/make-context.js';
import { makeGraph } from '#rules/test-support/make-graph.js';
import { only } from '#rules/test-support/only.js';
import { instability } from './index.js';

function edge(consumer: string, producer: string): Edge {
  return { consumer, producer, symbol: 'x', typeOnly: false };
}

function cfg(): ResolvedConfig {
  return { project: { sourceRoot: 'src' } } as ResolvedConfig;
}

/** A graph where subsystem `graph` has Ce=1 and Ca=1 → I = 0.5. */
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
  it('returns nothing when leafSubsystems is empty', () => {
    const ctx = makeContext('instability', { severity: 'info', options: {} });
    expect(instability.check(balancedGraph(), cfg(), ctx)).toEqual([]);
  });

  it('emits nothing for a leaf subsystem at or below the max', () => {
    const ctx = makeContext('instability', {
      severity: 'info',
      options: { maxForLeafSubsystems: 0.5, leafSubsystems: ['graph'] },
    });
    expect(instability.check(balancedGraph(), cfg(), ctx)).toEqual([]);
  });

  it('flags an unstable leaf subsystem', () => {
    const ctx = makeContext('instability', {
      severity: 'info',
      options: { maxForLeafSubsystems: 0.4, leafSubsystems: ['graph'] },
    });
    const d = only(instability.check(balancedGraph(), cfg(), ctx));
    expect(d.ruleId).toBe('instability');
    expect(d.entity).toBe('src/graph');
    expect(d.fingerprint).toBe('instability#graph');
    expect(d.message).toBe('subsystem graph is declared a leaf but is unstable');
    expect(d.expected).toBe('instability I ≤ 0.4');
    expect(d.actual).toBe('I = 0.50 (Ca=1, Ce=1)');
  });
});
