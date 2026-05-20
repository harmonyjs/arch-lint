/**
 * @fileoverview Tests for the sibling-asymmetry detector.
 */
import { describe, expect, it } from 'vitest';
import type { ResolvedConfig } from '#foundation/config/types.js';
import type { ConsumerGraph, Edge } from '#platform/graph/types.js';
import { makeGraph } from '#rules/test-support/make-graph.js';
import type { FolderTree } from '../model/tree.js';
import { findSiblingAsymmetry } from './sibling-asymmetry.js';
import type { DetectorInput } from './types.js';

const config = { project: { sourceRoot: 'src' } } as unknown as ResolvedConfig;

function edge(consumer: string, producer: string): Edge {
  return { consumer, producer, symbol: 'x', typeOnly: false };
}

function emptyFolder(path: string): FolderTree {
  return {
    path,
    name: path.split('/').pop() ?? '',
    folders: new Map(),
    files: [],
    folderNodes: [],
    subtreeSize: 0,
  };
}

function graphOf(edges: Edge[]): ConsumerGraph {
  return makeGraph({ edges });
}

/**
 * Builds a FolderTree for src/<parent> with subfolders <subs>. Each subfolder
 * is given one synthetic file `${sub}/_.ts` so it is structurally non-empty.
 */
function treeWithSiblings(parent: string, subs: string[]): FolderTree {
  const root = emptyFolder('src');
  const parentNode = emptyFolder(`src/${parent}`);
  root.folders.set(parentNode.path, parentNode);
  for (const sub of subs) {
    const subNode = emptyFolder(`src/${parent}/${sub}`);
    subNode.files.push(`src/${parent}/${sub}/_.ts`);
    parentNode.folders.set(subNode.path, subNode);
  }
  return root;
}

function inputOf(graph: ConsumerGraph, tree: FolderTree): DetectorInput {
  return { graph, config, tree, locByPath: new Map() };
}

describe('findSiblingAsymmetry', () => {
  it('reports a sub-folder used by some but not all sibling sub-folders', () => {
    const tree = treeWithSiblings('metrics', ['shared', 'a', 'b', 'c', 'd']);
    const graph = graphOf([
      edge('src/metrics/a/_.ts', 'src/metrics/shared/_.ts'),
      edge('src/metrics/b/_.ts', 'src/metrics/shared/_.ts'),
      edge('src/metrics/c/_.ts', 'src/metrics/shared/_.ts'),
    ]);
    const out = findSiblingAsymmetry(inputOf(graph, tree));
    expect(out).toHaveLength(1);
    expect(out[0]).toEqual({
      kind: 'sibling-asymmetry',
      folder: 'src/metrics/shared',
      usedBy: ['a', 'b', 'c'],
      missing: ['d'],
      total: 4,
    });
  });

  it('skips a sub-folder used by every sibling', () => {
    const tree = treeWithSiblings('p', ['shared', 'a', 'b', 'c']);
    const graph = graphOf([
      edge('src/p/a/_.ts', 'src/p/shared/_.ts'),
      edge('src/p/b/_.ts', 'src/p/shared/_.ts'),
      edge('src/p/c/_.ts', 'src/p/shared/_.ts'),
    ]);
    expect(findSiblingAsymmetry(inputOf(graph, tree))).toEqual([]);
  });

  it('skips a sub-folder used by zero siblings (orphan, not asymmetric)', () => {
    const tree = treeWithSiblings('p', ['shared', 'a', 'b', 'c']);
    const graph = graphOf([]);
    expect(findSiblingAsymmetry(inputOf(graph, tree))).toEqual([]);
  });

  it('skips a parent with fewer than three sub-folders', () => {
    const tree = treeWithSiblings('p', ['shared', 'a']);
    const graph = graphOf([edge('src/p/a/_.ts', 'src/p/shared/_.ts')]);
    expect(findSiblingAsymmetry(inputOf(graph, tree))).toEqual([]);
  });

  it('ignores edges that leave the parent folder', () => {
    const tree = treeWithSiblings('p', ['shared', 'a', 'b', 'c']);
    const graph = graphOf([
      edge('src/other/x.ts', 'src/p/shared/_.ts'),
      edge('src/p/a/_.ts', 'src/p/shared/_.ts'),
    ]);
    const out = findSiblingAsymmetry(inputOf(graph, tree));
    expect(out).toHaveLength(1);
    expect(out[0]?.usedBy).toEqual(['a']);
    expect(out[0]?.missing).toEqual(['b', 'c']);
  });
});
