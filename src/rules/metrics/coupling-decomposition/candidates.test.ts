/**
 * @fileoverview Tests for rankCandidateHomes / splitSuggestion — ranking
 * candidate homes for a facet's symbol by the new-edge delta.
 */
import { describe, expect, it } from 'vitest';
import type { ResolvedConfig } from '#foundation/config/types.js';
import type { Facet } from '#foundation/types/index.js';
import type { ConsumerGraph, Edge } from '#platform/graph/types.js';
import { rankCandidateHomes, splitSuggestion } from './candidates.js';

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
  units: { 'platform/a': 'platform/a/**', 'platform/b': 'platform/b/**' },
  layers: { platform: { canImport: ['foundation'] } },
} as unknown as ResolvedConfig;

const edge = (consumer: string, producer: string): Edge => ({
  consumer,
  producer,
  symbol: 's',
  typeOnly: false,
});

describe('rankCandidateHomes', () => {
  it('ranks the home where most consumers already depend first, flagged best', () => {
    // platform/b already depends on platform/a.
    const graph = graphOf([edge('src/platform/b/y.ts', 'src/platform/a/x.ts')]);
    const facet: Facet = { symbol: 's', units: ['platform/a', 'platform/b'] };
    const ranked = rankCandidateHomes(facet, graph, config);
    expect(ranked[0]).toEqual({ target: 'platform/a', note: '+0 new unit edges', best: true });
    expect(ranked[1]).toEqual({ target: 'platform/b', note: '+1 new unit edge', best: false });
  });
});

describe('splitSuggestion', () => {
  it('builds a split suggestion with ranked candidates for disjoint facets', () => {
    const graph = graphOf([edge('src/platform/b/y.ts', 'src/platform/a/x.ts')]);
    const s = splitSuggestion(
      {
        kind: 'coupling-facets',
        facets: [{ symbol: 's', units: ['platform/a', 'platform/b'] }],
        disjoint: true,
      },
      graph,
      config,
    );
    expect(s.action).toBe('split');
    expect(s.candidates?.[0]?.best).toBe(true);
  });

  it('omits candidates when there is no clean seam', () => {
    const graph = graphOf([]);
    const s = splitSuggestion(
      { kind: 'coupling-facets', facets: [], disjoint: true },
      graph,
      config,
    );
    expect(s.action).toBe('split');
    expect(s.candidates).toBeUndefined();
  });
});
