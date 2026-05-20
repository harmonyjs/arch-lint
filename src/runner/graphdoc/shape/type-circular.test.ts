/**
 * @fileoverview Tests for the type-circular detector (pair + triplet sub-forms).
 */
import { describe, expect, it } from 'vitest';
import type { ResolvedConfig } from '#foundation/config/types.js';
import type { ConsumerGraph, Edge } from '#platform/graph/types.js';
import { makeGraph } from '#rules/test-support/make-graph.js';
import type { FolderTree } from '../model/tree.js';
import { findTypeCircular } from './type-circular.js';
import type { DetectorInput } from './types.js';

const config = { project: { sourceRoot: 'src' } } as unknown as ResolvedConfig;

function edge(consumer: string, producer: string, typeOnly = false): Edge {
  return { consumer, producer, symbol: 'x', typeOnly };
}

function graphOf(edges: Edge[]): ConsumerGraph {
  return makeGraph({ edges });
}

const tree: FolderTree = {
  path: 'src',
  name: 'src',
  folders: new Map(),
  files: [],
  folderNodes: [],
  subtreeSize: 0,
};

function inputOf(graph: ConsumerGraph): DetectorInput {
  return { graph, config, tree, locByPath: new Map() };
}

describe('findTypeCircular — pair', () => {
  it('reports two files with opposite-direction edges of different kinds', () => {
    const graph = graphOf([
      edge('src/a.ts', 'src/b.ts', false),
      edge('src/b.ts', 'src/a.ts', true),
    ]);
    const out = findTypeCircular(inputOf(graph));
    expect(out).toEqual([{ kind: 'type-circular-pair', a: 'src/a.ts', b: 'src/b.ts' }]);
  });

  it('does not report a pair where both edges are runtime', () => {
    const graph = graphOf([
      edge('src/a.ts', 'src/b.ts', false),
      edge('src/b.ts', 'src/a.ts', false),
    ]);
    const out = findTypeCircular(inputOf(graph));
    expect(out.filter((f) => f.kind === 'type-circular-pair')).toEqual([]);
  });

  it('does not report a pair where both edges are type-only', () => {
    const graph = graphOf([edge('src/a.ts', 'src/b.ts', true), edge('src/b.ts', 'src/a.ts', true)]);
    const out = findTypeCircular(inputOf(graph));
    expect(out.filter((f) => f.kind === 'type-circular-pair')).toEqual([]);
  });

  it('deduplicates a pair emitted from both sides of the inspection', () => {
    const graph = graphOf([
      edge('src/a.ts', 'src/b.ts', false),
      edge('src/b.ts', 'src/a.ts', true),
    ]);
    const out = findTypeCircular(inputOf(graph));
    expect(out.filter((f) => f.kind === 'type-circular-pair')).toHaveLength(1);
  });
});

describe('findTypeCircular — triplet', () => {
  it('reports A→B type-only with a shared runtime consumer C', () => {
    const graph = graphOf([
      edge('src/verdict.ts', 'src/analyze.ts', true),
      edge('src/thin-rule.ts', 'src/analyze.ts', false),
      edge('src/thin-rule.ts', 'src/verdict.ts', false),
    ]);
    const out = findTypeCircular(inputOf(graph));
    const triplets = out.filter((f) => f.kind === 'type-circular-triplet');
    expect(triplets).toEqual([
      {
        kind: 'type-circular-triplet',
        a: 'src/verdict.ts',
        b: 'src/analyze.ts',
        consumer: 'src/thin-rule.ts',
      },
    ]);
  });

  it('does not report a triplet when no shared runtime consumer exists', () => {
    const graph = graphOf([edge('src/a.ts', 'src/b.ts', true)]);
    const out = findTypeCircular(inputOf(graph));
    expect(out.filter((f) => f.kind === 'type-circular-triplet')).toEqual([]);
  });

  it('requires the shared consumer to use BOTH a and b with runtime edges', () => {
    const graph = graphOf([
      edge('src/a.ts', 'src/b.ts', true),
      edge('src/c.ts', 'src/a.ts', false),
      edge('src/c.ts', 'src/b.ts', true),
    ]);
    const out = findTypeCircular(inputOf(graph));
    expect(out.filter((f) => f.kind === 'type-circular-triplet')).toEqual([]);
  });
});
