/**
 * @fileoverview Detects a sub-folder used by some-but-not-all of its sibling
 * sub-folders. Surfaces uneven role within a pack (e.g., a primitives folder
 * consumed by four of five rule sub-folders).
 */
import { isAtOrUnderPrefix } from '#foundation/entity-id/index.js';
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
  const reachFrom = buildSubFolderReach(graph, subs);
  for (const target of subs) {
    const usedBy: string[] = [];
    const missing: string[] = [];
    for (const sibling of subs) {
      if (sibling === target) continue;
      if (reachFrom.get(sibling.path)?.has(target.path) === true) usedBy.push(sibling.name);
      else missing.push(sibling.name);
    }
    if (usedBy.length === 0 || missing.length === 0) continue;
    out.push({
      kind: 'sibling-asymmetry',
      folder: target.path,
      usedBy: usedBy.sort(),
      missing: missing.sort(),
      total: usedBy.length + missing.length,
    });
  }
}

/**
 * Single pass over `graph.edges`: maps each immediate sub-folder to the set of
 * sibling sub-folders it imports from. Built once per parent, replacing the
 * O(S*S*E) per-pair `anyEdge` scan with O(E + S*S).
 */
function buildSubFolderReach(
  graph: ConsumerGraph,
  subs: readonly FolderTree[],
): Map<string, Set<string>> {
  const reach = new Map<string, Set<string>>();
  if (subs.length === 0) return reach;
  for (const edge of graph.edges) {
    const fromSub = subFolderOf(edge.consumer, subs);
    if (fromSub === null) continue;
    const toSub = subFolderOf(edge.producer, subs);
    if (toSub === null) continue;
    if (fromSub === toSub) continue;
    let bucket = reach.get(fromSub);
    if (bucket === undefined) {
      bucket = new Set();
      reach.set(fromSub, bucket);
    }
    bucket.add(toSub);
  }
  return reach;
}

/** Returns the immediate sub-folder path that `id` lies under, or null. */
function subFolderOf(id: string, subs: readonly FolderTree[]): string | null {
  for (const sub of subs) {
    if (isAtOrUnderPrefix(id, sub.path)) return sub.path;
  }
  return null;
}
