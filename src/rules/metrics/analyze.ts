/**
 * @fileoverview analyzeMetrics — computes every per-subsystem metric in one
 * pass: afferent/efferent coupling, instability and internal cohesion.
 * Memoized per (graph, layers, sourceRoot) so the metrics rules share one
 * computation.
 */
import type { LayersConfig, ResolvedConfig } from '#foundation/config/types.js';
import { type SubsystemCoupling, subsystemCoupling, subsystemOf } from '#platform/graph/index.js';
import type { ConsumerGraph } from '#platform/graph/types.js';

/** Every metric arch-lint measures for one subsystem. */
export interface SubsystemMetrics {
  readonly ca: number;
  readonly ce: number;
  readonly instability: number;
  readonly inboundSubsystems: ReadonlySet<string>;
  readonly outboundSubsystems: ReadonlySet<string>;
  readonly cohesiveEntityFiles: number;
  readonly entityFiles: number;
}

/** Per-subsystem metrics for one run, keyed by subsystem name. */
export type MetricsReport = ReadonlyMap<string, SubsystemMetrics>;

/**
 * The default `layers` value — a single shared frozen object so that callers
 * whose config carries no `layers` all share one stable cache identity and a
 * valid (non-`undefined`) WeakMap key. Mirrors `subsystem-coupling`'s `NO_LAYERS`.
 */
const NO_LAYERS: LayersConfig = Object.freeze({});

/**
 * Cache keyed on the `(graph, layers, sourceRoot)` triple — mirrors
 * `subsystemCoupling`'s `couplingCache`. The ConsumerGraph and `layers` object
 * are both frozen for the lifetime of a run, so a nested WeakMap is safe and
 * auto-clears. `layers` is part of the key because a `MetricsReport` embeds
 * layer-aware subsystem names: `subsystemOf` buckets files differently per
 * `layers`, so a report folded with one `layers` map must not be returned for
 * a call with a different one.
 */
const reportCache = new WeakMap<ConsumerGraph, WeakMap<LayersConfig, Map<string, MetricsReport>>>();

function cohesiveFilesOf(
  graph: ConsumerGraph,
  root: string,
  layers: LayersConfig,
): ReadonlySet<string> {
  const result = new Set<string>();
  for (const edge of graph.edges) {
    if (edge.consumer === edge.producer) continue;
    const consumerSubsystem = subsystemOf(edge.consumer, root, layers);
    if (
      consumerSubsystem !== null &&
      consumerSubsystem === subsystemOf(edge.producer, root, layers)
    ) {
      result.add(edge.consumer);
    }
  }
  return result;
}

function metricsOf(
  graph: ConsumerGraph,
  info: SubsystemCoupling,
  cohesive: ReadonlySet<string>,
): SubsystemMetrics {
  const total = info.ca + info.ce;
  let entityFiles = 0;
  let cohesiveEntityFiles = 0;
  for (const file of info.files) {
    if (graph.nodes.get(file)?.isEntity !== true) continue;
    entityFiles += 1;
    if (cohesive.has(file)) cohesiveEntityFiles += 1;
  }
  return {
    ca: info.ca,
    ce: info.ce,
    instability: total === 0 ? 0 : info.ce / total,
    inboundSubsystems: info.inboundSubsystems,
    outboundSubsystems: info.outboundSubsystems,
    cohesiveEntityFiles,
    entityFiles,
  };
}

function computeReport(graph: ConsumerGraph, root: string, layers: LayersConfig): MetricsReport {
  const coupling = subsystemCoupling(graph, root, layers);
  const cohesive = cohesiveFilesOf(graph, root, layers);
  const report = new Map<string, SubsystemMetrics>();
  for (const [subsystem, info] of coupling) {
    report.set(subsystem, metricsOf(graph, info, cohesive));
  }
  return report;
}

/**
 * Every per-subsystem metric for the run, memoized on (graph, layers,
 * sourceRoot) so the metrics rules trigger a single computation — mirrors
 * `subsystemCoupling`.
 */
export function analyzeMetrics(graph: ConsumerGraph, config: ResolvedConfig): MetricsReport {
  const root = config.project.sourceRoot;
  const layers = config.layers ?? NO_LAYERS;
  let byLayers = reportCache.get(graph);
  if (byLayers === undefined) {
    byLayers = new WeakMap();
    reportCache.set(graph, byLayers);
  }
  let byRoot = byLayers.get(layers);
  if (byRoot === undefined) {
    byRoot = new Map();
    byLayers.set(layers, byRoot);
  }
  const cached = byRoot.get(root);
  if (cached !== undefined) return cached;
  const report = computeReport(graph, root, layers);
  byRoot.set(root, report);
  return report;
}
