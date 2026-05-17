/**
 * @fileoverview Tests for the model edge projection — unresolved projection,
 * coupling badges, and subsystem edge aggregation.
 */
import { describe, expect, it } from 'vitest';
import type { ResolvedConfig } from '../../config/types.js';
import type { UnresolvedImport } from '../../graph/types.js';
import { makeGraph } from '../../rules/test-support/make-graph.js';
import type { RenderNode } from '../types.js';
import { aggregateSubsystemEdges, badgeOf, projectUnresolved } from './edges.js';
import { baseNode, IdMint, type ProjectionContext, type SectionBody } from './nodes.js';

function cfg(): ResolvedConfig {
  return {
    project: { sourceRoot: 'src', cwd: '.', tsconfig: 'tsconfig.json' },
    layers: {},
    conventions: {
      privateSegment: 'private',
      sharedSegment: 'shared',
      libSegment: 'lib',
      hooksSegment: 'hooks',
      explicitClusterSegment: 'ui',
      modelSegment: 'model',
    },
  } as ResolvedConfig;
}

function ctxFor(unresolved: readonly UnresolvedImport[]): ProjectionContext {
  const graph = makeGraph({ nodes: { 'src/a/x.ts': {} }, unresolved });
  return {
    graph,
    fileoverviews: new Map(),
    config: cfg(),
    root: 'src',
    cyclic: new Set(),
    sectionSlugs: new Map(),
  };
}

function bodyWith(path: string, id: string): SectionBody {
  const node = baseNode(id, path, path);
  return { nodes: [node], clusters: [], byPath: new Map([[path, node]]) };
}

function unresolvedEntry(over: Partial<UnresolvedImport> = {}): UnresolvedImport {
  return {
    file: 'src/a/x.ts',
    specifier: 'node:fs/promises',
    symbol: 'readFile',
    location: { file: 'src/a/x.ts', line: 1, column: 1 },
    reason: 'missing',
    ...over,
  };
}

describe('projectUnresolved', () => {
  it('emits one edge for a specifier imported twice from the same file', () => {
    const ctx = ctxFor([
      unresolvedEntry({ symbol: 'readFile' }),
      unresolvedEntry({ symbol: 'writeFile' }),
    ]);
    const result = projectUnresolved(bodyWith('src/a/x.ts', 'n0'), new IdMint(), ctx);
    expect(result.edges.length).toBe(1);
    expect(result.nodes.length).toBe(1);
  });

  it('routes the reason into the unresolved node fileoverview', () => {
    const ctx = ctxFor([unresolvedEntry({ reason: 'ambiguous-wildcard' })]);
    const result = projectUnresolved(bodyWith('src/a/x.ts', 'n0'), new IdMint(), ctx);
    expect(result.nodes[0]?.fileoverview).toBe('unresolved (ambiguous-wildcard)');
  });

  it('keeps distinct specifiers as separate nodes and edges', () => {
    const ctx = ctxFor([
      unresolvedEntry({ specifier: 'node:fs' }),
      unresolvedEntry({ specifier: 'node:path' }),
    ]);
    const result = projectUnresolved(bodyWith('src/a/x.ts', 'n0'), new IdMint(), ctx);
    expect(result.nodes.length).toBe(2);
    expect(result.edges.length).toBe(2);
  });
});

describe('badgeOf', () => {
  it('computes a stable instability', () => {
    expect(badgeOf(1, 4).instability).toBeCloseTo(0.2);
  });

  it('computes a neutral instability', () => {
    expect(badgeOf(1, 1).instability).toBeCloseTo(0.5);
  });

  it('computes an unstable instability', () => {
    expect(badgeOf(4, 1).instability).toBeCloseTo(0.8);
  });

  it('returns 0 when ce and ca are both 0', () => {
    expect(badgeOf(0, 0).instability).toBe(0);
  });
});

describe('aggregateSubsystemEdges', () => {
  function subsystemNode(id: string, name: string): RenderNode {
    return { ...baseNode(id, `src/${name}`, name), kind: 'group' };
  }

  it('tags the minority-weight direction as the back edge', () => {
    const graph = makeGraph({
      nodes: { 'src/a/x.ts': {}, 'src/a/x2.ts': {}, 'src/b/y.ts': {} },
      edges: [
        { consumer: 'src/a/x.ts', producer: 'src/b/y.ts', symbol: 'Y', typeOnly: false },
        { consumer: 'src/a/x2.ts', producer: 'src/b/y.ts', symbol: 'Y2', typeOnly: false },
        { consumer: 'src/b/y.ts', producer: 'src/a/x.ts', symbol: 'X', typeOnly: false },
      ],
    });
    const byName = new Map<string, RenderNode>([
      ['a', subsystemNode('n0', 'a')],
      ['b', subsystemNode('n1', 'b')],
    ]);
    const edges = aggregateSubsystemEdges(graph, 'src', byName);
    const back = edges.filter((e) => e.back);
    expect(back.length).toBe(1);
    expect(back[0]?.fromId).toBe('n1');
    expect(back[0]?.toId).toBe('n0');
    expect(back[0]?.weight).toBe(1);
  });

  it('breaks an equal-weight cycle tie on from > to', () => {
    const graph = makeGraph({
      nodes: { 'src/a/x.ts': {}, 'src/b/y.ts': {} },
      edges: [
        { consumer: 'src/a/x.ts', producer: 'src/b/y.ts', symbol: 'Y', typeOnly: false },
        { consumer: 'src/b/y.ts', producer: 'src/a/x.ts', symbol: 'X', typeOnly: false },
      ],
    });
    const byName = new Map<string, RenderNode>([
      ['a', subsystemNode('n0', 'a')],
      ['b', subsystemNode('n1', 'b')],
    ]);
    const edges = aggregateSubsystemEdges(graph, 'src', byName);
    const back = edges.filter((e) => e.back);
    expect(back.length).toBe(1);
    expect(back[0]?.fromId).toBe('n1');
    expect(back[0]?.toId).toBe('n0');
  });
});
