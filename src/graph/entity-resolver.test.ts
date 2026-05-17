import { describe, expect, it } from 'vitest';
import { makeGraph } from '../rules/test-support/make-graph.js';
import { graphEntityResolver } from './entity-resolver.js';

describe('graphEntityResolver', () => {
  it('maps a standalone file node to a SuppressEntity rooted at the file itself', () => {
    const graph = makeGraph({ nodes: { 'src/util.ts': { kind: 'file', isEntity: true } } });
    expect(graphEntityResolver(graph).listEntities()).toEqual([
      { id: 'src/util.ts', name: 'util', entryFilePath: 'src/util.ts' },
    ]);
  });
  it('maps a component-folder entry file to an entity rooted at that folder', () => {
    const graph = makeGraph({
      nodes: {
        'src/Widget': { kind: 'folder', isEntity: true },
        'src/Widget/Widget.tsx': { kind: 'file', isEntity: false },
      },
    });
    expect(graphEntityResolver(graph).listEntities()).toEqual([
      { id: 'src/Widget', name: 'Widget', entryFilePath: 'src/Widget/Widget.tsx' },
    ]);
  });
  it('deduplicates: two files of one component folder yield one entity', () => {
    const graph = makeGraph({
      nodes: {
        'src/Widget': { kind: 'folder', isEntity: true },
        'src/Widget/Widget.tsx': { kind: 'file', isEntity: false },
        'src/Widget/helper.ts': { kind: 'file', isEntity: false },
      },
    });
    expect(
      graphEntityResolver(graph)
        .listEntities()
        .map((e) => e.id),
    ).toEqual(['src/Widget']);
  });
  it('returns entities sorted by id for determinism', () => {
    const graph = makeGraph({
      nodes: {
        'src/b.ts': { kind: 'file', isEntity: true },
        'src/a.ts': { kind: 'file', isEntity: true },
      },
    });
    expect(
      graphEntityResolver(graph)
        .listEntities()
        .map((e) => e.id),
    ).toEqual(['src/a.ts', 'src/b.ts']);
  });
});
