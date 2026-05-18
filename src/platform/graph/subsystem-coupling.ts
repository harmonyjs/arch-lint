/**
 * @fileoverview Subsystem-coupling helper — folds the file-level ConsumerGraph into
 * per-subsystem coupling figures (efferent/afferent, membership, inbound set). A
 * subsystem is the first path segment after the source root — or, when that
 * segment is a declared layer, the first two segments, so a subsystem stays a
 * real module rather than a whole layer grab-bag.
 */
import type { LayersConfig } from '#foundation/config/types.js';
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
 * The default `layers` value — a single shared frozen object so that callers
 * that omit `layers` all share one stable cache identity (see `couplingCache`).
 */
const NO_LAYERS: LayersConfig = Object.freeze({});

/**
 * Subsystem of a file id: strips a leading `sourceRoot + '/'` then takes the segment
 * before the first remaining `/`. A root-level file — one directly under the source
 * root, with no further `/` — has no subsystem: it is shared lexicon, not a subsystem,
 * so this returns `null` and the metrics fold excludes it entirely.
 *
 * When the first segment is a declared layer (a key of `layers`), a whole layer is
 * a deliberate grab-bag, not a module — so the subsystem descends one level: it is
 * the first two segments joined (`foundation/config`), or just the layer name when
 * the file sits directly in the layer root (`runner/check.ts` → `runner`). An empty
 * `layers` map means no segment is ever a layer — the first-segment behavior.
 */
export function subsystemOf(
  fileId: string,
  sourceRoot: string,
  layers: LayersConfig = NO_LAYERS,
): string | null {
  const prefix = `${sourceRoot}/`;
  const rest = fileId.startsWith(prefix) ? fileId.slice(prefix.length) : fileId;
  const slash = rest.indexOf('/');
  if (slash === -1) return null;
  const first = rest.slice(0, slash);
  if (!Object.hasOwn(layers, first)) return first;
  const secondSlash = rest.indexOf('/', slash + 1);
  return secondSlash === -1 ? first : rest.slice(0, secondSlash);
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
 * Cache keyed on the `(graph, layers, sourceRoot)` triple: every metric rule folds
 * the same graph with the same `layers`, so the fold is computed once and reused.
 * The ConsumerGraph and `layers` object are both frozen for the lifetime of a run,
 * so a nested WeakMap is safe and auto-clears. `layers` is part of the key because
 * it changes how `subsystemOf` names a subsystem — the metrics fold (layer-aware)
 * and the graphdoc fold (top-level) must not poison each other's cache entry.
 */
const couplingCache = new WeakMap<
  ConsumerGraph,
  WeakMap<LayersConfig, Map<string, ReadonlyMap<string, SubsystemCoupling>>>
>();

/**
 * Folds the file-level ConsumerGraph into per-subsystem coupling figures. Every
 * `kind: 'file'` node that belongs to a subsystem contributes its membership;
 * root-level files belong to no subsystem and are skipped. Every cross-subsystem
 * edge whose consumer and producer both belong to a subsystem records an outbound
 * link on the consumer subsystem and an inbound link on the producer one; an edge
 * touching a root-level file is not an inter-subsystem coupling link and is skipped.
 * The fold is memoized per `(graph, layers, sourceRoot)` triple — repeated calls
 * with the same `layers` object are a lookup.
 */
export function subsystemCoupling(
  graph: ConsumerGraph,
  sourceRoot: string,
  layers: LayersConfig = NO_LAYERS,
): ReadonlyMap<string, SubsystemCoupling> {
  let byLayers = couplingCache.get(graph);
  if (byLayers === undefined) {
    byLayers = new WeakMap();
    couplingCache.set(graph, byLayers);
  }
  let byRoot = byLayers.get(layers);
  if (byRoot === undefined) {
    byRoot = new Map();
    byLayers.set(layers, byRoot);
  }
  const cached = byRoot.get(sourceRoot);
  if (cached !== undefined) return cached;

  const coupling = computeSubsystemCoupling(graph, sourceRoot, layers);
  byRoot.set(sourceRoot, coupling);
  return coupling;
}

/** Performs the graph fold without caching — the body behind `subsystemCoupling`. */
function computeSubsystemCoupling(
  graph: ConsumerGraph,
  sourceRoot: string,
  layers: LayersConfig,
): ReadonlyMap<string, SubsystemCoupling> {
  const accumulators = new Map<string, SubsystemAccumulator>();

  for (const node of graph.nodes.values()) {
    if (node.kind !== 'file') continue;
    const subsystem = subsystemOf(node.id, sourceRoot, layers);
    if (subsystem === null) continue;
    accumulatorFor(accumulators, subsystem).files.add(node.id);
  }

  for (const edge of graph.edges) {
    const consumerSubsystem = subsystemOf(edge.consumer, sourceRoot, layers);
    const producerSubsystem = subsystemOf(edge.producer, sourceRoot, layers);
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
