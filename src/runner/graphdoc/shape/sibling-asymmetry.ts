/**
 * @fileoverview Detects a sub-folder used by some-but-not-all of its sibling
 * sub-folders. Surfaces uneven role within a pack (e.g., a primitives folder
 * consumed by four of five rule sub-folders).
 */
import type { ConsumerGraph } from '#platform/graph/types.js';
import type { FolderTree } from '../model/tree.js';
import type { DetectorInput, SiblingAsymmetryFinding } from './types.js';

const MIN_SIBLINGS = 3;

/** Walks the folder tree and emits sibling-asymmetry findings. */
export function findSiblingAsymmetry(input: DetectorInput): SiblingAsymmetryFinding[] {
  const out: SiblingAsymmetryFinding[] = [];
  walk(input.tree, input.graph, out);
  return out;
}

/** Recursively visits every folder; each visit checks its own sub-folders. */
function walk(folder: FolderTree, graph: ConsumerGraph, out: SiblingAsymmetryFinding[]): void {
  inspectParent(folder, graph, out);
  for (const child of folder.folders.values()) walk(child, graph, out);
}

/** Tests every sub-folder of `parent` for some-but-not-all sibling usage. */
function inspectParent(
  parent: FolderTree,
  graph: ConsumerGraph,
  out: SiblingAsymmetryFinding[],
): void {
  const subs = [...parent.folders.values()];
  if (subs.length < MIN_SIBLINGS) return;
  for (const target of subs) {
    const others = subs.filter((s) => s !== target);
    const usedBy: string[] = [];
    const missing: string[] = [];
    for (const sibling of others) {
      if (anyEdge(graph, sibling.path, target.path)) usedBy.push(sibling.name);
      else missing.push(sibling.name);
    }
    if (usedBy.length === 0 || missing.length === 0) continue;
    out.push({
      kind: 'sibling-asymmetry',
      folder: target.path,
      usedBy: usedBy.sort(),
      missing: missing.sort(),
      total: others.length,
    });
  }
}

/** True when any runtime-or-type edge has its consumer under `from` and producer under `to`. */
function anyEdge(graph: ConsumerGraph, fromFolder: string, toFolder: string): boolean {
  const fromPrefix = `${fromFolder}/`;
  const toPrefix = `${toFolder}/`;
  for (const edge of graph.edges) {
    if (edge.consumer.startsWith(fromPrefix) && edge.producer.startsWith(toPrefix)) return true;
  }
  return false;
}
