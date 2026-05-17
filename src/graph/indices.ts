/**
 * @fileoverview Builds the forward (consumersOf) and reverse (producersOf) edge
 * indices of the consumer graph from a flat edge list.
 */
import type { Edge } from './types.js';
export interface EdgeIndices {
  readonly consumersOf: ReadonlyMap<string, readonly Edge[]>;
  readonly producersOf: ReadonlyMap<string, readonly Edge[]>;
}

const compareEdges = (a: Edge, b: Edge): number =>
  a.consumer.localeCompare(b.consumer) ||
  a.producer.localeCompare(b.producer) ||
  a.symbol.localeCompare(b.symbol);

/** Appends `edge` to the bucket for `key`, creating the bucket on first use. */
function pushInto(index: Map<string, Edge[]>, key: string, edge: Edge): void {
  let bucket = index.get(key);
  if (bucket === undefined) {
    bucket = [];
    index.set(key, bucket);
  }
  bucket.push(edge);
}

/** Indexes `edges` by producer (consumersOf) and by consumer (producersOf). */
export function buildIndices(edges: readonly Edge[]): EdgeIndices {
  const byProducer = new Map<string, Edge[]>();
  const byConsumer = new Map<string, Edge[]>();
  for (const edge of edges) {
    pushInto(byProducer, edge.producer, edge);
    pushInto(byConsumer, edge.consumer, edge);
  }
  for (const bucket of byProducer.values()) {
    bucket.sort(compareEdges);
  }
  for (const bucket of byConsumer.values()) {
    bucket.sort(compareEdges);
  }
  return { consumersOf: byProducer, producersOf: byConsumer };
}
