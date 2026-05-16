/**
 * @fileoverview Test-only helper that builds a mock graph whose file nodes are seeded
 * with the given source texts — shared scaffolding for perfile rule unit tests.
 */
import { makeGraph } from '../../test-support/make-graph.js';
import type { MockGraph } from '../../test-support/make-graph.js';

/** Builds a MockGraph with one file node per entry of `files`, seeded with its text. */
export function perfileTestGraph(files: Readonly<Record<string, string>>): MockGraph {
  const nodes: Record<string, { kind: 'file' }> = {};
  for (const id of Object.keys(files)) nodes[id] = { kind: 'file' };
  return makeGraph({ nodes, files });
}
