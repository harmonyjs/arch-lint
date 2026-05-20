/**
 * @fileoverview Detects type-circular shape — a pair of files with edges of
 * different kinds in opposite directions, and a triplet where an A→B type-only
 * edge has a shared runtime consumer C wired to both A and B.
 */
import type { ConsumerGraph, Edge } from '#platform/graph/types.js';
import type {
  DetectorInput,
  ShapeFinding,
  TypeCircularPairFinding,
  TypeCircularTripletFinding,
} from './types.js';

/** Emits both pair and triplet findings, in that order. */
export function findTypeCircular(input: DetectorInput): ShapeFinding[] {
  return [...findPairs(input.graph), ...findTriplets(input.graph)];
}

/** Pair: two files with edges of opposite directions and different kinds. */
function findPairs(graph: ConsumerGraph): TypeCircularPairFinding[] {
  const out: TypeCircularPairFinding[] = [];
  const seen = new Set<string>();
  for (const e of graph.edges) {
    if (e.consumer === e.producer) continue;
    const reverseKind = oppositeKind(graph, e);
    if (reverseKind === null) continue;
    if (reverseKind === e.typeOnly) continue;
    const [a, b] = [e.consumer, e.producer].sort();
    if (a === undefined || b === undefined) continue;
    const key = `${a}|${b}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ kind: 'type-circular-pair', a, b });
  }
  return out;
}

/** True/false: the `typeOnly` of the first reverse edge found, or null when none. */
function oppositeKind(graph: ConsumerGraph, edge: Edge): boolean | null {
  for (const candidate of graph.edges) {
    if (candidate.consumer === edge.producer && candidate.producer === edge.consumer) {
      return candidate.typeOnly;
    }
  }
  return null;
}

/** Triplet: A→B type-only AND a shared runtime consumer C with edges to both. */
function findTriplets(graph: ConsumerGraph): TypeCircularTripletFinding[] {
  const out: TypeCircularTripletFinding[] = [];
  const seen = new Set<string>();
  for (const edge of graph.edges) {
    if (!edge.typeOnly) continue;
    const a = edge.consumer;
    const b = edge.producer;
    if (a === b) continue;
    for (const consumer of sharedRuntimeConsumers(graph, a, b)) {
      const key = `${a}|${b}|${consumer}`;
      if (seen.has(key)) continue;
      seen.add(key);
      out.push({ kind: 'type-circular-triplet', a, b, consumer });
    }
  }
  return out;
}

/** Files that import both `a` and `b` via runtime edges. */
function sharedRuntimeConsumers(graph: ConsumerGraph, a: string, b: string): string[] {
  const runtimeOf = new Map<string, Set<string>>();
  for (const edge of graph.edges) {
    if (edge.typeOnly) continue;
    let producers = runtimeOf.get(edge.consumer);
    if (producers === undefined) {
      producers = new Set();
      runtimeOf.set(edge.consumer, producers);
    }
    producers.add(edge.producer);
  }
  const out: string[] = [];
  for (const [consumer, producers] of runtimeOf) {
    if (producers.has(a) && producers.has(b)) out.push(consumer);
  }
  return out.sort();
}
