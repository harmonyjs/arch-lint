/**
 * @fileoverview Tests for couplingFacets — grouping a unit's cross-boundary
 * coupling by consumed symbol.
 */
import { describe, expect, it } from 'vitest';
import type { ResolvedConfig } from '#foundation/config/types.js';
import type { ConsumerGraph, Edge } from '#platform/graph/types.js';
import { couplingFacets } from './facets.js';

function graphOf(edges: Edge[]): ConsumerGraph {
  return {
    nodes: new Map(),
    edges,
    consumersOf: new Map(),
    producersOf: new Map(),
    entityConsumersOf: new Map(),
    unresolved: [],
    builtAt: new Date(0),
    rootDir: '/p/src',
  };
}

const config = {
  project: { sourceRoot: 'src' },
  units: { u: 'u/**', a: 'a/**', b: 'b/**' },
} as unknown as ResolvedConfig;

const edge = (consumer: string, producer: string, symbol: string): Edge => ({
  consumer,
  producer,
  symbol,
  typeOnly: false,
});

describe('couplingFacets', () => {
  it('groups inbound dependents by consumed symbol and reports disjointness', () => {
    const graph = graphOf([
      edge('src/a/x.ts', 'src/u/s.ts', 'one'),
      edge('src/b/y.ts', 'src/u/s.ts', 'two'),
    ]);
    const result = couplingFacets('u', graph, config, 'inbound');
    expect(result.kind).toBe('coupling-facets');
    expect(result.facets).toEqual([
      { symbol: 'one', units: ['a'] },
      { symbol: 'two', units: ['b'] },
    ]);
    expect(result.disjoint).toBe(true);
  });

  it('flags overlapping facets as not disjoint', () => {
    const graph = graphOf([
      edge('src/a/x.ts', 'src/u/s.ts', 'one'),
      edge('src/a/x.ts', 'src/u/s.ts', 'two'),
    ]);
    expect(couplingFacets('u', graph, config, 'inbound').disjoint).toBe(false);
  });
});
