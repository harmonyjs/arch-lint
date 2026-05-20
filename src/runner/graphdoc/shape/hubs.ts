/**
 * @fileoverview Detects intra-folder hubs — files whose sibling fan-in or
 * fan-out reaches the threshold. Barrels are excluded by basename because they
 * are hubs by design.
 */
import { baseNameOf } from '#foundation/entity-id/index.js';
import type { ConsumerGraph, Edge } from '#platform/graph/types.js';
import type { FolderTree } from '../model/tree.js';
import type { DetectorInput, HubFinding } from './types.js';

const THRESHOLD = 3;
const BARREL_BASENAMES = new Set(['index.ts', 'index.tsx']);

/** Walks the folder tree and emits hub findings. */
export function findHubs(input: DetectorInput): HubFinding[] {
  const out: HubFinding[] = [];
  walk(input.tree, input.graph, out);
  return out;
}

/** Visits every folder, scoring its direct files for sibling fan-in/out. */
function walk(folder: FolderTree, graph: ConsumerGraph, out: HubFinding[]): void {
  inspectFolder(folder, graph, out);
  for (const child of folder.folders.values()) walk(child, graph, out);
}

/** Tallies fan-in/out for each non-barrel file in `folder`. */
function inspectFolder(folder: FolderTree, graph: ConsumerGraph, out: HubFinding[]): void {
  const sibling = new Set(folder.files);
  for (const file of folder.files) {
    if (BARREL_BASENAMES.has(baseNameOf(file))) continue;
    const fanOut = countSiblingEdges(graph.producersOf.get(file), 'producer', sibling, file);
    const fanIn = countSiblingEdges(graph.consumersOf.get(file), 'consumer', sibling, file);
    if (fanIn >= THRESHOLD || fanOut >= THRESHOLD) {
      out.push({ kind: 'hub', file, fanIn, fanOut });
    }
  }
}

/**
 * Counts edges whose `other` end is a sibling file ≠ `self`.
 *
 * `producersOf.get(file)` returns edges where `file` is the consumer — the
 * other end is the producer, so passing `'producer'` counts fan-out.
 * `consumersOf.get(file)` returns edges where `file` is the producer — the
 * other end is the consumer, so passing `'consumer'` counts fan-in.
 */
function countSiblingEdges(
  edges: readonly Edge[] | undefined,
  otherEnd: 'producer' | 'consumer',
  sibling: ReadonlySet<string>,
  self: string,
): number {
  if (edges === undefined) return 0;
  let count = 0;
  for (const edge of edges) {
    const other = edge[otherEnd];
    if (other !== self && sibling.has(other)) count += 1;
  }
  return count;
}
