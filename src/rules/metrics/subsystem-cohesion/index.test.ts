/**
 * @fileoverview Tests for the subsystem-cohesion metrics rule.
 */
import { describe, expect, it } from 'vitest';
import type { ResolvedConfig } from '#foundation/config/types.js';
import type { Edge } from '#platform/graph/types.js';
import { makeContext } from '#rules/test-support/make-context.js';
import { makeGraph } from '#rules/test-support/make-graph.js';
import { only } from '#rules/test-support/only.js';
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
  it('skips subsystems with fewer than two entity files', () => {
    const graph = makeGraph({
      nodes: { 'src/graph/a.ts': { kind: 'file', isEntity: true } },
      edges: [],
    });
    const ctx = makeContext('subsystem-cohesion', { severity: 'warning', options: {} });
    expect(subsystemCohesion.check(graph, cfg(), ctx)).toEqual([]);
  });

  it('emits nothing at or above the min cohesion', () => {
    const graph = makeGraph({
      nodes: {
        'src/graph/a.ts': { kind: 'file', isEntity: true },
        'src/graph/b.ts': { kind: 'file', isEntity: true },
      },
      edges: [edge('src/graph/a.ts', 'src/graph/b.ts')],
    });
    const ctx = makeContext('subsystem-cohesion', { severity: 'warning', options: { min: 0.5 } });
    expect(subsystemCohesion.check(graph, cfg(), ctx)).toEqual([]);
  });

  it('flags a subsystem below the min cohesion', () => {
    const graph = makeGraph({
      nodes: {
        'src/graph/a.ts': { kind: 'file', isEntity: true },
        'src/graph/b.ts': { kind: 'file', isEntity: true },
        'src/graph/c.ts': { kind: 'file', isEntity: true },
        'src/graph/d.ts': { kind: 'file', isEntity: true },
      },
      edges: [edge('src/graph/a.ts', 'src/graph/b.ts')],
    });
    const ctx = makeContext('subsystem-cohesion', { severity: 'warning', options: { min: 0.5 } });
    const d = only(subsystemCohesion.check(graph, cfg(), ctx));
    expect(d.ruleId).toBe('subsystem-cohesion');
    expect(d.entity).toBe('src/graph');
    expect(d.fingerprint).toBe('subsystem-cohesion#graph');
    expect(d.message).toBe('subsystem graph has low internal cohesion');
    expect(d.expected).toBe('cohesion ≥ 0.5');
    expect(d.actual).toBe('0.25 (1/4 files import a sibling)');
  });

  it('excludes non-entity files from numerator and denominator', () => {
    const graph = makeGraph({
      nodes: {
        'src/graph/a.ts': { kind: 'file', isEntity: true },
        'src/graph/b.ts': { kind: 'file', isEntity: true },
        'src/graph/index.ts': { kind: 'file', isEntity: false },
        'src/graph/types.ts': { kind: 'file', isEntity: false },
      },
      edges: [edge('src/graph/a.ts', 'src/graph/b.ts')],
    });
    const ctx = makeContext('subsystem-cohesion', { severity: 'warning', options: { min: 0.5 } });
    // Only a.ts and b.ts count; a.ts imports a sibling → 1/2 = 0.5, at the min, no flag.
    expect(subsystemCohesion.check(graph, cfg(), ctx)).toEqual([]);
  });

  it('skips a subsystem with fewer than two entity files even when it has many barrels', () => {
    const graph = makeGraph({
      nodes: {
        'src/graph/a.ts': { kind: 'file', isEntity: true },
        'src/graph/index.ts': { kind: 'file', isEntity: false },
        'src/graph/extra.ts': { kind: 'file', isEntity: false },
      },
      edges: [],
    });
    const ctx = makeContext('subsystem-cohesion', { severity: 'warning', options: { min: 0.5 } });
    expect(subsystemCohesion.check(graph, cfg(), ctx)).toEqual([]);
  });

  it('respects the ignoreSubsystems list', () => {
    const graph = makeGraph({
      nodes: {
        'src/graph/a.ts': { kind: 'file', isEntity: true },
        'src/graph/b.ts': { kind: 'file', isEntity: true },
        'src/graph/c.ts': { kind: 'file', isEntity: true },
        'src/graph/d.ts': { kind: 'file', isEntity: true },
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
