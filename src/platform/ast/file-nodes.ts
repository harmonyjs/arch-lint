/**
 * @fileoverview file-node enumeration over a ConsumerGraph.
 */
import type { ConsumerGraph } from '#platform/graph/types.js';

/** The ids of every file-kind node in the graph, in iteration order. */
export function fileNodeIds(graph: ConsumerGraph): string[] {
  const out: string[] = [];
  for (const node of graph.nodes.values()) {
    if (node.kind === 'file') out.push(node.id);
  }
  return out;
}
