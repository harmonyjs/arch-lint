/**
 * @fileoverview Tests for the cross-cutting-concern metrics rule — the per-unit
 * four-signal conjunction (high Ca, high Ce, low cohesion, low abstractness).
 */
import { describe, expect, it } from 'vitest';
import type { ResolvedConfig, UnitsConfig } from '#foundation/config/types.js';
import type { Edge } from '#platform/graph/types.js';
import { makeContext } from '#rules/test-support/make-context.js';
import { makeGraph } from '#rules/test-support/make-graph.js';
import { only } from '#rules/test-support/only.js';
import { crossCuttingConcern } from './index.js';

function edge(consumer: string, producer: string, typeOnly = false): Edge {
  return { consumer, producer, symbol: 'x', typeOnly };
}

function cfg(units: UnitsConfig = {}): ResolvedConfig {
  return { project: { sourceRoot: 'src' }, units, layers: {} } as ResolvedConfig;
}

/**
 * A graph where unit `god` trips all four signals: 3 units import it (Ca=3),
 * it imports 3 units (Ce=3), its 3 entity files never reference a sibling
 * (cohesion 0), and every inbound edge is a value import (abstractness 0).
 */
function godUnitGraph() {
  return makeGraph({
    nodes: {
      'src/god/a.ts': { kind: 'file', isEntity: true },
      'src/god/b.ts': { kind: 'file', isEntity: true },
      'src/god/c.ts': { kind: 'file', isEntity: true },
      'src/in1/x.ts': { kind: 'file' },
      'src/in2/x.ts': { kind: 'file' },
      'src/in3/x.ts': { kind: 'file' },
      'src/out1/y.ts': { kind: 'file' },
      'src/out2/y.ts': { kind: 'file' },
      'src/out3/y.ts': { kind: 'file' },
    },
    edges: [
      edge('src/in1/x.ts', 'src/god/a.ts'),
      edge('src/in2/x.ts', 'src/god/b.ts'),
      edge('src/in3/x.ts', 'src/god/c.ts'),
      edge('src/god/a.ts', 'src/out1/y.ts'),
      edge('src/god/b.ts', 'src/out2/y.ts'),
      edge('src/god/c.ts', 'src/out3/y.ts'),
    ],
  });
}

const ALL_UNITS: UnitsConfig = {
  god: 'god/**',
  in1: 'in1/**',
  in2: 'in2/**',
  in3: 'in3/**',
  out1: 'out1/**',
  out2: 'out2/**',
  out3: 'out3/**',
};

const LOOSE = { minCa: 3, minCe: 3, maxCohesion: 0.5, maxAbstractness: 0.5 };

describe('crossCuttingConcern — metadata', () => {
  it('has the canonical metadata', () => {
    expect(crossCuttingConcern.id).toBe('cross-cutting-concern');
    expect(crossCuttingConcern.pack).toBe('metrics');
    expect(crossCuttingConcern.engine).toBe('graph');
    expect(crossCuttingConcern.defaultSeverity).toBe('info');
  });
});

describe('crossCuttingConcern — check', () => {
  it('is inert when no units are declared', () => {
    const ctx = makeContext('cross-cutting-concern', { severity: 'info', options: LOOSE });
    expect(crossCuttingConcern.check(godUnitGraph(), cfg(), ctx)).toEqual([]);
  });

  it('flags a unit that trips all four signals', () => {
    const ctx = makeContext('cross-cutting-concern', { severity: 'info', options: LOOSE });
    const d = only(crossCuttingConcern.check(godUnitGraph(), cfg(ALL_UNITS), ctx));
    expect(d.ruleId).toBe('cross-cutting-concern');
    expect(d.entity).toBe('god');
    expect(d.fingerprint).toBe('cross-cutting-concern#god');
    expect(d.message).toBe('unit god is a cross-cutting concern');
    expect(d.actual).toBe('Ca=3, Ce=3, cohesion=0.00, abstractness=0.00');
  });

  it('does not flag when the high-Ce signal is absent', () => {
    // Same as the god graph but with the outbound edges removed → Ce = 0.
    const graph = makeGraph({
      nodes: {
        'src/god/a.ts': { kind: 'file', isEntity: true },
        'src/god/b.ts': { kind: 'file', isEntity: true },
        'src/god/c.ts': { kind: 'file', isEntity: true },
        'src/in1/x.ts': { kind: 'file' },
        'src/in2/x.ts': { kind: 'file' },
        'src/in3/x.ts': { kind: 'file' },
      },
      edges: [
        edge('src/in1/x.ts', 'src/god/a.ts'),
        edge('src/in2/x.ts', 'src/god/b.ts'),
        edge('src/in3/x.ts', 'src/god/c.ts'),
      ],
    });
    const units: UnitsConfig = { god: 'god/**', in1: 'in1/**', in2: 'in2/**', in3: 'in3/**' };
    const ctx = makeContext('cross-cutting-concern', { severity: 'info', options: LOOSE });
    expect(crossCuttingConcern.check(graph, cfg(units), ctx)).toEqual([]);
  });

  it('exonerates a unit imported predominantly via type-only edges', () => {
    const graph = makeGraph({
      nodes: {
        'src/god/a.ts': { kind: 'file', isEntity: true },
        'src/god/b.ts': { kind: 'file', isEntity: true },
        'src/god/c.ts': { kind: 'file', isEntity: true },
        'src/in1/x.ts': { kind: 'file' },
        'src/in2/x.ts': { kind: 'file' },
        'src/in3/x.ts': { kind: 'file' },
        'src/out1/y.ts': { kind: 'file' },
        'src/out2/y.ts': { kind: 'file' },
        'src/out3/y.ts': { kind: 'file' },
      },
      edges: [
        edge('src/in1/x.ts', 'src/god/a.ts', true),
        edge('src/in2/x.ts', 'src/god/b.ts', true),
        edge('src/in3/x.ts', 'src/god/c.ts', true),
        edge('src/god/a.ts', 'src/out1/y.ts'),
        edge('src/god/b.ts', 'src/out2/y.ts'),
        edge('src/god/c.ts', 'src/out3/y.ts'),
      ],
    });
    const ctx = makeContext('cross-cutting-concern', { severity: 'info', options: LOOSE });
    expect(crossCuttingConcern.check(graph, cfg(ALL_UNITS), ctx)).toEqual([]);
  });

  it('skips a unit listed in allow', () => {
    const ctx = makeContext('cross-cutting-concern', {
      severity: 'info',
      options: { ...LOOSE, allow: ['god'] },
    });
    expect(crossCuttingConcern.check(godUnitGraph(), cfg(ALL_UNITS), ctx)).toEqual([]);
  });

  it('does not flag below the default thresholds', () => {
    const ctx = makeContext('cross-cutting-concern', { severity: 'info' });
    expect(crossCuttingConcern.check(godUnitGraph(), cfg(ALL_UNITS), ctx)).toEqual([]);
  });
});
