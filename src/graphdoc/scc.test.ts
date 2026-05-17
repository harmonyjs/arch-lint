/**
 * @fileoverview Tests for Tarjan SCC and cyclic-node detection.
 */
import { describe, expect, it } from 'vitest';
import { cyclicNodes, stronglyConnectedComponents } from './scc.js';

describe('stronglyConnectedComponents', () => {
  it('returns singletons for a DAG', () => {
    const adj = new Map([
      ['a', ['b']],
      ['b', ['c']],
      ['c', []],
    ]);
    const sccs = stronglyConnectedComponents(adj).map((c) => [...c].sort());
    expect(sccs.map((c) => c.length).sort()).toEqual([1, 1, 1]);
  });

  it('groups a 3-node cycle into one component', () => {
    const adj = new Map([
      ['a', ['b']],
      ['b', ['c']],
      ['c', ['a']],
    ]);
    const cyclic = stronglyConnectedComponents(adj).filter((c) => c.length > 1);
    expect(cyclic).toHaveLength(1);
    expect([...cyclic[0]!].sort()).toEqual(['a', 'b', 'c']);
  });
});

describe('cyclicNodes', () => {
  it('reports nodes in a cycle and ignores DAG nodes', () => {
    const adj = new Map([
      ['a', ['b']],
      ['b', ['a']],
      ['c', ['a']],
    ]);
    const cyclic = cyclicNodes(adj);
    expect(cyclic.has('a')).toBe(true);
    expect(cyclic.has('b')).toBe(true);
    expect(cyclic.has('c')).toBe(false);
  });

  it('treats a self-loop as cyclic', () => {
    const adj = new Map([['a', ['a']]]);
    expect(cyclicNodes(adj).has('a')).toBe(true);
  });
});
