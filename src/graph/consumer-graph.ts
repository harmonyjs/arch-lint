/**
 * @fileoverview Assembles the immutable ConsumerGraph from nodes, edges and the
 * unresolved-import list, building indices and the entity-consumer projection.
 */

import { type EntityContext, projectEntityConsumers } from './entities.js';
import { buildIndices } from './indices.js';
import type { ConsumerGraph, Edge, Node, UnresolvedImport } from './types.js';

export interface FreezeGraphInput {
  readonly nodes: ReadonlyMap<string, Node>;
  readonly edges: readonly Edge[];
  readonly unresolved: readonly UnresolvedImport[];
  readonly entityCtx: EntityContext;
  readonly rootDir: string;
}

/**
 * Builds and freezes a ConsumerGraph: indices via buildIndices, the entity-consumer
 * projection via projectEntityConsumers, a fresh `builtAt` timestamp.
 */
export function freezeGraph(input: FreezeGraphInput): ConsumerGraph {
  const { consumersOf, producersOf } = buildIndices(input.edges);
  const entityConsumersOf = projectEntityConsumers(input.edges, input.entityCtx);
  const graph: ConsumerGraph = {
    nodes: input.nodes,
    edges: Object.freeze([...input.edges]),
    consumersOf,
    producersOf,
    entityConsumersOf,
    unresolved: Object.freeze([...input.unresolved]),
    builtAt: new Date(),
    rootDir: input.rootDir,
  };
  return Object.freeze(graph);
}
