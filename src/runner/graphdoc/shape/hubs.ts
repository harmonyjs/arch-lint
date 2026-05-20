/**
 * @fileoverview Detects intra-folder hubs — files whose sibling fan-in or
 * fan-out reaches the threshold. Barrels are excluded by basename because they
 * are hubs by design.
 */
import type { ConsumerGraph } from '#platform/graph/types.js';
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
    if (BARREL_BASENAMES.has(basenameOf(file))) continue;
    let fanIn = 0;
    let fanOut = 0;
    for (const edge of graph.edges) {
      if (edge.producer === file && sibling.has(edge.consumer) && edge.consumer !== file) fanIn += 1;
      if (edge.consumer === file && sibling.has(edge.producer) && edge.producer !== file) fanOut += 1;
    }
    if (fanIn >= THRESHOLD || fanOut >= THRESHOLD) {
      out.push({ kind: 'hub', file, fanIn, fanOut });
    }
  }
}

/** Returns the last path segment of `path`. */
function basenameOf(path: string): string {
  const slash = path.lastIndexOf('/');
  return slash === -1 ? path : path.slice(slash + 1);
}
