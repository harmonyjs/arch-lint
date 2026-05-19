/**
 * @fileoverview Tests for graphEntityResolver — listEntities projection and
 * sourceFileFor lookup over a ts-morph Project.
 */

import { Project } from 'ts-morph';
import { describe, expect, it } from 'vitest';
import type { SuppressEntity } from '#foundation/types/index.js';
import { makeGraph } from '#rules/test-support/make-graph.js';
import { graphEntityResolver } from './entity-resolver.js';

const emptyProject = new Project({ useInMemoryFileSystem: true });

describe('graphEntityResolver — listEntities', () => {
  it('maps a standalone file node to a SuppressEntity rooted at the file itself', () => {
    const graph = makeGraph({ nodes: { 'src/util.ts': { kind: 'file', isEntity: true } } });
    expect(graphEntityResolver(graph, emptyProject).listEntities()).toEqual([
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
    expect(graphEntityResolver(graph, emptyProject).listEntities()).toEqual([
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
      graphEntityResolver(graph, emptyProject)
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
      graphEntityResolver(graph, emptyProject)
        .listEntities()
        .map((e) => e.id),
    ).toEqual(['src/a.ts', 'src/b.ts']);
  });
});

describe('graphEntityResolver — sourceFileFor', () => {
  it('resolves an entity entry file to its parsed SourceFile', () => {
    const project = new Project({ useInMemoryFileSystem: true });
    project.createSourceFile('src/Widget/Widget.tsx', 'export const Widget = () => null;');
    const graph = makeGraph({
      nodes: { 'src/Widget/Widget.tsx': { kind: 'file', isEntity: true } },
    });
    const entity: SuppressEntity = {
      id: 'src/Widget',
      name: 'Widget',
      entryFilePath: 'src/Widget/Widget.tsx',
    };
    expect(graphEntityResolver(graph, project).sourceFileFor(entity)?.getFilePath()).toContain(
      'src/Widget/Widget.tsx',
    );
  });
  it('returns undefined for an entity whose file is absent from the project', () => {
    const project = new Project({ useInMemoryFileSystem: true });
    const graph = makeGraph({ nodes: { 'src/util.ts': { kind: 'file', isEntity: true } } });
    const entity: SuppressEntity = { id: 'src/x', name: 'x', entryFilePath: 'src/x/x.ts' };
    expect(graphEntityResolver(graph, project).sourceFileFor(entity)).toBeUndefined();
  });
});
