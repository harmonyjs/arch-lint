/**
 * @fileoverview Tests for the makeGraph mock-graph factory used across rule unit tests.
 */
import { describe, it, expect } from 'vitest';
import { makeGraph } from './make-graph.js';

describe('makeGraph', () => {
  it('builds a frozen ConsumerGraph with default empty collections', () => {
    const g = makeGraph({});
    expect(g.nodes.size).toBe(0);
    expect(g.edges).toEqual([]);
    expect(g.unresolved).toEqual([]);
    expect(g.rootDir).toBe('src');
    expect(Object.isFrozen(g)).toBe(true);
  });

  it('materializes nodes from the nodes spec with defaults', () => {
    const g = makeGraph({ nodes: { 'src/App': { kind: 'folder', isEntity: true } } });
    const node = g.nodes.get('src/App');
    expect(node).toEqual({
      id: 'src/App',
      kind: 'folder',
      isEntity: true,
      placementMode: 'reactive',
    });
  });

  it('derives consumersOf and producersOf from edges', () => {
    const edge = {
      consumer: 'src/App/App.tsx',
      producer: 'src/lib/util.ts',
      symbol: 'util',
      typeOnly: false,
    } as const;
    const g = makeGraph({ edges: [edge] });
    expect(g.consumersOf.get('src/lib/util.ts')).toEqual([edge]);
    expect(g.producersOf.get('src/App/App.tsx')).toEqual([edge]);
  });

  it('groups multiple edges under the same producer', () => {
    const e1 = { consumer: 'a.ts', producer: 'p.ts', symbol: 'x', typeOnly: false } as const;
    const e2 = { consumer: 'b.ts', producer: 'p.ts', symbol: 'y', typeOnly: false } as const;
    const g = makeGraph({ edges: [e1, e2] });
    expect(g.consumersOf.get('p.ts')).toEqual([e1, e2]);
  });

  it('exposes entityConsumers and an in-memory ts-morph project', () => {
    const g = makeGraph({ entityConsumers: { 'src/App/X': ['src/App'] } });
    expect(g.entityConsumersOf.get('src/App/X')).toEqual(['src/App']);
    expect(g.project.getSourceFiles()).toEqual([]);
  });

  it('seeds project source files supplied via the files spec', () => {
    const g = makeGraph({ files: { 'src/lib/util.ts': "import { x } from 'react';" } });
    const file = g.project.getSourceFile('src/lib/util.ts');
    expect(file).toBeDefined();
    expect(file?.getImportDeclarations()).toHaveLength(1);
  });
});
