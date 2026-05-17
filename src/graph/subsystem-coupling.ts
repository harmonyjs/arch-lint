/**
 * @fileoverview Subsystem-coupling helper — folds the file-level ConsumerGraph into
 * per-subsystem coupling figures (efferent/afferent, membership, inbound set). A
 * subsystem is the first path segment after the source root.
 */
import type { ConsumerGraph } from './types.js';

/** Per-subsystem coupling figures folded from the file-level ConsumerGraph. */
export interface SubsystemCoupling {
  /** Efferent coupling — distinct subsystems this subsystem depends on. */
  readonly ce: number;
  /** Afferent coupling — distinct subsystems that depend on this subsystem. */
  readonly ca: number;
  /** File ids that belong to this subsystem. */
  readonly files: ReadonlySet<string>;
  /** Subsystems that import at least one file of this subsystem. */
  readonly inboundSubsystems: ReadonlySet<string>;
  /** Subsystems this subsystem imports at least one file from. */
  readonly outboundSubsystems: ReadonlySet<string>;
}

/** Mutable accumulator for a single subsystem while folding the graph. */
interface SubsystemAccumulator {
  readonly files: Set<string>;
  readonly inboundSubsystems: Set<string>;
  readonly outboundSubsystems: Set<string>;
}

/**
 * Subsystem of a file id: strips a leading `sourceRoot + '/'` then takes the segment
 * before the first remaining `/`. A root-level file — one directly under the source
 * root, with no further `/` — has no subsystem: it is shared lexicon, not a subsystem,
 * so this returns `null` and the metrics fold excludes it entirely.
 */
export function subsystemOf(fileId: string, sourceRoot: string): string | null {
  const prefix = `${sourceRoot}/`;
  const rest = fileId.startsWith(prefix) ? fileId.slice(prefix.length) : fileId;
  const slash = rest.indexOf('/');
  return slash === -1 ? null : rest.slice(0, slash);
}

/** Returns the accumulator for `name`, creating an empty one on first sight. */
function accumulatorFor(
  map: Map<string, SubsystemAccumulator>,
  name: string,
): SubsystemAccumulator {
  let acc = map.get(name);
  if (acc === undefined) {
    acc = { files: new Set(), inboundSubsystems: new Set(), outboundSubsystems: new Set() };
    map.set(name, acc);
  }
  return acc;
}

/**
 * Cache keyed on the `(graph, sourceRoot)` pair: every metric rule folds the same
 * graph, so the fold is computed once per pair and reused. The ConsumerGraph is
 * frozen for the lifetime of a run, so a WeakMap key is safe and auto-clears.
 */
const couplingCache = new WeakMap<
  ConsumerGraph,
  Map<string, ReadonlyMap<string, SubsystemCoupling>>
>();

/**
 * Folds the file-level ConsumerGraph into per-subsystem coupling figures. Every
 * `kind: 'file'` node that belongs to a subsystem contributes its membership;
 * root-level files belong to no subsystem and are skipped. Every cross-subsystem
 * edge whose consumer and producer both belong to a subsystem records an outbound
 * link on the consumer subsystem and an inbound link on the producer one; an edge
 * touching a root-level file is not an inter-subsystem coupling link and is skipped.
 * The fold is memoized per `(graph, sourceRoot)` pair — repeated calls are a lookup.
 */
export function subsystemCoupling(
  graph: ConsumerGraph,
  sourceRoot: string,
): ReadonlyMap<string, SubsystemCoupling> {
  let byRoot = couplingCache.get(graph);
  if (byRoot === undefined) {
    byRoot = new Map();
    couplingCache.set(graph, byRoot);
  }
  const cached = byRoot.get(sourceRoot);
  if (cached !== undefined) return cached;

  const coupling = computeSubsystemCoupling(graph, sourceRoot);
  byRoot.set(sourceRoot, coupling);
  return coupling;
}

/** Performs the graph fold without caching — the body behind `subsystemCoupling`. */
function computeSubsystemCoupling(
  graph: ConsumerGraph,
  sourceRoot: string,
): ReadonlyMap<string, SubsystemCoupling> {
  const accumulators = new Map<string, SubsystemAccumulator>();

  for (const node of graph.nodes.values()) {
    if (node.kind !== 'file') continue;
    const subsystem = subsystemOf(node.id, sourceRoot);
    if (subsystem === null) continue;
    accumulatorFor(accumulators, subsystem).files.add(node.id);
  }

  for (const edge of graph.edges) {
    const consumerSubsystem = subsystemOf(edge.consumer, sourceRoot);
    const producerSubsystem = subsystemOf(edge.producer, sourceRoot);
    if (consumerSubsystem === null || producerSubsystem === null) continue;
    if (consumerSubsystem === producerSubsystem) continue;
    accumulatorFor(accumulators, consumerSubsystem).outboundSubsystems.add(producerSubsystem);
    accumulatorFor(accumulators, producerSubsystem).inboundSubsystems.add(consumerSubsystem);
  }

  const coupling = new Map<string, SubsystemCoupling>();
  for (const [name, acc] of accumulators) {
    coupling.set(name, {
      ce: acc.outboundSubsystems.size,
      ca: acc.inboundSubsystems.size,
      files: acc.files,
      inboundSubsystems: acc.inboundSubsystems,
      outboundSubsystems: acc.outboundSubsystems,
    });
  }
  return coupling;
}
