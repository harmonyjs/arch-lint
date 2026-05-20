/**
 * @fileoverview Tests for the hubs detector.
 */
import { describe, expect, it } from 'vitest';
import type { ResolvedConfig } from '#foundation/config/types.js';
import type { ConsumerGraph, Edge } from '#platform/graph/types.js';
import { makeGraph } from '#rules/test-support/make-graph.js';
import type { FolderTree } from '../model/tree.js';
import { findHubs } from './hubs.js';
import type { DetectorInput } from './types.js';

const config = { project: { sourceRoot: 'src' } } as unknown as ResolvedConfig;

function edge(consumer: string, producer: string): Edge {
  return { consumer, producer, symbol: 'x', typeOnly: false };
}

function folderOf(path: string, files: string[]): FolderTree {
  return {
    path,
    name: path.split('/').pop() ?? '',
    folders: new Map(),
    files,
    folderNodes: [],
    subtreeSize: files.length,
  };
}

function graphOf(edges: Edge[]): ConsumerGraph {
  return makeGraph({ edges });
}

function inputOf(graph: ConsumerGraph, tree: FolderTree): DetectorInput {
  return { graph, config, tree, locByPath: new Map() };
}

describe('findHubs', () => {
  it('reports a file with fan-out ≥ 3 to siblings', () => {
    const tree = folderOf('src/runner', [
      'src/runner/cli.ts',
      'src/runner/cli-commands.ts',
      'src/runner/check.ts',
      'src/runner/explain.ts',
      'src/runner/graph.ts',
      'src/runner/watch.ts',
    ]);
    const graph = graphOf([
      edge('src/runner/cli-commands.ts', 'src/runner/check.ts'),
      edge('src/runner/cli-commands.ts', 'src/runner/explain.ts'),
      edge('src/runner/cli-commands.ts', 'src/runner/graph.ts'),
      edge('src/runner/cli-commands.ts', 'src/runner/watch.ts'),
      edge('src/runner/cli.ts', 'src/runner/cli-commands.ts'),
    ]);
    const out = findHubs(inputOf(graph, tree));
    expect(out).toContainEqual({
      kind: 'hub',
      file: 'src/runner/cli-commands.ts',
      fanIn: 1,
      fanOut: 4,
    });
  });

  it('reports a file with fan-in ≥ 3 from siblings', () => {
    const tree = folderOf('src/p', ['src/p/shared.ts', 'src/p/a.ts', 'src/p/b.ts', 'src/p/c.ts']);
    const graph = graphOf([
      edge('src/p/a.ts', 'src/p/shared.ts'),
      edge('src/p/b.ts', 'src/p/shared.ts'),
      edge('src/p/c.ts', 'src/p/shared.ts'),
    ]);
    const out = findHubs(inputOf(graph, tree));
    expect(out.find((f) => f.file === 'src/p/shared.ts')?.fanIn).toBe(3);
  });

  it('does not report a file below threshold', () => {
    const tree = folderOf('src/p', ['src/p/x.ts', 'src/p/y.ts', 'src/p/z.ts']);
    const graph = graphOf([edge('src/p/y.ts', 'src/p/x.ts'), edge('src/p/z.ts', 'src/p/x.ts')]);
    const out = findHubs(inputOf(graph, tree));
    expect(out.find((f) => f.file === 'src/p/x.ts')).toBeUndefined();
  });

  it('excludes index.ts barrels by basename', () => {
    const tree = folderOf('src/p', [
      'src/p/index.ts',
      'src/p/a.ts',
      'src/p/b.ts',
      'src/p/c.ts',
      'src/p/d.ts',
    ]);
    const graph = graphOf([
      edge('src/p/a.ts', 'src/p/index.ts'),
      edge('src/p/b.ts', 'src/p/index.ts'),
      edge('src/p/c.ts', 'src/p/index.ts'),
      edge('src/p/d.ts', 'src/p/index.ts'),
    ]);
    const out = findHubs(inputOf(graph, tree));
    expect(out.find((f) => f.file === 'src/p/index.ts')).toBeUndefined();
  });

  it('counts only intra-folder edges', () => {
    const tree = folderOf('src/p', ['src/p/x.ts', 'src/p/y.ts']);
    const graph = graphOf([
      edge('src/other/a.ts', 'src/p/x.ts'),
      edge('src/other/b.ts', 'src/p/x.ts'),
      edge('src/other/c.ts', 'src/p/x.ts'),
      edge('src/p/y.ts', 'src/p/x.ts'),
    ]);
    const out = findHubs(inputOf(graph, tree));
    expect(out.find((f) => f.file === 'src/p/x.ts')).toBeUndefined();
  });
});
