/**
 * @fileoverview Tests for the subsystem-cohesion metrics rule.
 */
import { describe, expect, it } from 'vitest';
import type { ResolvedConfig } from '../../../config/types.js';
import type { Edge } from '../../../graph/types.js';
import { makeContext } from '../../test-support/make-context.js';
import { makeGraph } from '../../test-support/make-graph.js';
import { subsystemCohesion } from './index.js';

function edge(consumer: string, producer: string): Edge {
  return { consumer, producer, symbol: 'x', typeOnly: false };
}

function cfg(): ResolvedConfig {
  return { project: { sourceRoot: 'src' } } as ResolvedConfig;
}

describe('subsystemCohesion — metadata', () => {
  it('has the canonical metadata', () => {
    expect(subsystemCohesion.id).toBe('subsystem-cohesion');
    expect(subsystemCohesion.pack).toBe('metrics');
    expect(subsystemCohesion.engine).toBe('graph');
    expect(subsystemCohesion.defaultSeverity).toBe('warning');
  });
});

describe('subsystemCohesion — check', () => {
  it('skips single-file subsystems', () => {
    const graph = makeGraph({ nodes: { 'src/graph/a.ts': { kind: 'file' } }, edges: [] });
    const ctx = makeContext('subsystem-cohesion', { severity: 'warning', options: {} });
    expect(subsystemCohesion.check(graph, cfg(), ctx)).toEqual([]);
  });

  it('emits nothing at or above the min cohesion', () => {
    const graph = makeGraph({
      nodes: { 'src/graph/a.ts': { kind: 'file' }, 'src/graph/b.ts': { kind: 'file' } },
      edges: [edge('src/graph/a.ts', 'src/graph/b.ts')],
    });
    const ctx = makeContext('subsystem-cohesion', { severity: 'warning', options: { min: 0.5 } });
    expect(subsystemCohesion.check(graph, cfg(), ctx)).toEqual([]);
  });

  it('flags a subsystem below the min cohesion', () => {
    const graph = makeGraph({
      nodes: {
        'src/graph/a.ts': { kind: 'file' },
        'src/graph/b.ts': { kind: 'file' },
        'src/graph/c.ts': { kind: 'file' },
        'src/graph/d.ts': { kind: 'file' },
      },
      edges: [edge('src/graph/a.ts', 'src/graph/b.ts')],
    });
    const ctx = makeContext('subsystem-cohesion', { severity: 'warning', options: { min: 0.5 } });
    const out = subsystemCohesion.check(graph, cfg(), ctx);
    expect(out).toHaveLength(1);
    expect(out[0]!.ruleId).toBe('subsystem-cohesion');
    expect(out[0]!.entity).toBe('src/graph');
    expect(out[0]!.fingerprint).toBe('subsystem-cohesion#graph');
    expect(out[0]!.message).toBe('subsystem graph has low internal cohesion');
    expect(out[0]!.expected).toBe('cohesion ≥ 0.5');
    expect(out[0]!.actual).toBe('0.25 (1/4 files import a sibling)');
  });

  it('respects the ignoreSubsystems list', () => {
    const graph = makeGraph({
      nodes: {
        'src/graph/a.ts': { kind: 'file' },
        'src/graph/b.ts': { kind: 'file' },
        'src/graph/c.ts': { kind: 'file' },
        'src/graph/d.ts': { kind: 'file' },
      },
      edges: [edge('src/graph/a.ts', 'src/graph/b.ts')],
    });
    const ctx = makeContext('subsystem-cohesion', {
      severity: 'warning',
      options: { min: 0.5, ignoreSubsystems: ['graph'] },
    });
    expect(subsystemCohesion.check(graph, cfg(), ctx)).toEqual([]);
  });
});
