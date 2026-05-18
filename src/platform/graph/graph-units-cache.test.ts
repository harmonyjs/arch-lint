/**
 * @fileoverview Tests for GraphUnitsCache — the (graph, units, sourceRoot) memo.
 */
import { describe, expect, it } from 'vitest';
import type { UnitsConfig } from '#foundation/config/types.js';
import { makeGraph } from '#rules/test-support/make-graph.js';
import { GraphUnitsCache } from './graph-units-cache.js';

describe('GraphUnitsCache', () => {
  it('computes once and returns the cached value on a repeat call', () => {
    const cache = new GraphUnitsCache<{ n: number }>();
    const graph = makeGraph({});
    const units: UnitsConfig = {};
    let calls = 0;
    const first = cache.get(graph, units, 'src', () => {
      calls += 1;
      return { n: 1 };
    });
    const second = cache.get(graph, units, 'src', () => {
      calls += 1;
      return { n: 2 };
    });
    expect(calls).toBe(1);
    expect(second).toBe(first);
  });

  it('keys distinctly on the units object and the sourceRoot', () => {
    const cache = new GraphUnitsCache<number>();
    const graph = makeGraph({});
    const unitsA: UnitsConfig = {};
    const unitsB: UnitsConfig = {};
    let n = 0;
    cache.get(graph, unitsA, 'src', () => (n += 1));
    cache.get(graph, unitsB, 'src', () => (n += 1));
    cache.get(graph, unitsA, 'lib', () => (n += 1));
    cache.get(graph, unitsA, 'src', () => (n += 1));
    expect(n).toBe(3);
  });
});
