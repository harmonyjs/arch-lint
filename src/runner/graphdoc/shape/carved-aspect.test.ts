/**
 * @fileoverview Tests for the carved-aspect detector.
 */
import { describe, expect, it } from 'vitest';
import type { ResolvedConfig } from '#foundation/config/types.js';
import type { ConsumerGraph, Edge } from '#platform/graph/types.js';
import { makeGraph } from '#rules/test-support/make-graph.js';
import type { FolderTree } from '#runner/graphdoc/model/tree.js';
import { findCarvedAspect } from './carved-aspect.js';
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

function inputOf(graph: ConsumerGraph, tree: FolderTree, loc: Map<string, number>): DetectorInput {
  return { graph, config, tree, locByPath: loc };
}

describe('findCarvedAspect', () => {
  it('reports a carved-aspect pair with core → aspect direction', () => {
    const tree = folderOf('src/runner', ['src/runner/check.ts', 'src/runner/check-logging.ts']);
    const graph = graphOf([edge('src/runner/check.ts', 'src/runner/check-logging.ts')]);
    const loc = new Map([
      ['src/runner/check.ts', 314],
      ['src/runner/check-logging.ts', 35],
    ]);
    const out = findCarvedAspect(inputOf(graph, { ...tree, folders: new Map() }, loc));
    expect(out).toEqual([
      {
        kind: 'carved-aspect',
        core: 'src/runner/check.ts',
        aspect: 'src/runner/check-logging.ts',
        coreLoc: 314,
        aspectLoc: 35,
        direction: 'core→aspect',
      },
    ]);
  });

  it('reports a carved-aspect pair with aspect → core direction', () => {
    const tree = folderOf('src/runner', ['src/runner/cli.ts', 'src/runner/cli-commands.ts']);
    const graph = graphOf([edge('src/runner/cli-commands.ts', 'src/runner/cli.ts')]);
    const loc = new Map([
      ['src/runner/cli.ts', 68],
      ['src/runner/cli-commands.ts', 219],
    ]);
    const out = findCarvedAspect(inputOf(graph, tree, loc));
    expect(out).toHaveLength(1);
    expect(out[0]?.direction).toBe('aspect→core');
    expect(out[0]?.core).toBe('src/runner/cli.ts');
    expect(out[0]?.aspect).toBe('src/runner/cli-commands.ts');
  });

  it('does not report a pair without an edge between the two files', () => {
    const tree = folderOf('src/runner', ['src/runner/check.ts', 'src/runner/check-logging.ts']);
    const graph = graphOf([]);
    expect(findCarvedAspect(inputOf(graph, tree, new Map()))).toEqual([]);
  });

  it('does not pair files in different folders', () => {
    const root: FolderTree = {
      path: 'src',
      name: 'src',
      folders: new Map<string, FolderTree>([
        ['src/a', folderOf('src/a', ['src/a/check.ts'])],
        ['src/b', folderOf('src/b', ['src/b/check-logging.ts'])],
      ]),
      files: [],
      folderNodes: [],
      subtreeSize: 2,
    };
    const graph = graphOf([edge('src/a/check.ts', 'src/b/check-logging.ts')]);
    expect(findCarvedAspect(inputOf(graph, root, new Map()))).toEqual([]);
  });

  it('ignores files whose names share a prefix but not the X / X-aspect form', () => {
    const tree = folderOf('src/runner', ['src/runner/checker.ts', 'src/runner/check-logging.ts']);
    const graph = graphOf([edge('src/runner/checker.ts', 'src/runner/check-logging.ts')]);
    expect(findCarvedAspect(inputOf(graph, tree, new Map()))).toEqual([]);
  });

  it('uses 0 LOC for files missing from the lookup', () => {
    const tree = folderOf('src/runner', ['src/runner/check.ts', 'src/runner/check-logging.ts']);
    const graph = graphOf([edge('src/runner/check.ts', 'src/runner/check-logging.ts')]);
    const out = findCarvedAspect(inputOf(graph, tree, new Map()));
    expect(out[0]?.coreLoc).toBe(0);
    expect(out[0]?.aspectLoc).toBe(0);
  });
});
