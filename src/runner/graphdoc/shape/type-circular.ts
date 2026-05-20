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

/**
 * `typeOnly` of the first reverse edge found, or null when none.
 *
 * `producersOf.get(edge.producer)` returns edges where `edge.producer` is the
 * consumer — i.e., outgoing edges from `edge.producer`. The reverse of `edge`
 * is the one whose producer is `edge.consumer`.
 */
function oppositeKind(graph: ConsumerGraph, edge: Edge): boolean | null {
  for (const candidate of graph.producersOf.get(edge.producer) ?? []) {
    if (candidate.producer === edge.consumer) return candidate.typeOnly;
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
  const into = (target: string): Set<string> => {
    const result = new Set<string>();
    for (const edge of graph.consumersOf.get(target) ?? []) {
      if (!edge.typeOnly) result.add(edge.consumer);
    }
    return result;
  };
  const consumersOfA = into(a);
  const consumersOfB = into(b);
  const shared: string[] = [];
  for (const c of consumersOfA) if (consumersOfB.has(c)) shared.push(c);
  return shared.sort();
}
