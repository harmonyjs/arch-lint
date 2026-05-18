/**
 * @fileoverview analyzeMetrics — computes every per-subsystem metric in one
 * pass: afferent/efferent coupling, instability and internal cohesion.
 * Memoized per (graph, units, sourceRoot) so the metrics rules share one
 * computation.
 */
import type { ResolvedConfig, UnitsConfig } from '#foundation/config/types.js';
import { type UnitCoupling, unitCoupling, unitOf } from '#platform/graph/index.js';
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
 * The default `units` value — a single shared frozen object so callers whose
 * config carries no `units` share one stable cache identity and a valid WeakMap
 * key.
 */
const NO_UNITS: UnitsConfig = Object.freeze({});

/**
 * Cache keyed on the `(graph, units, sourceRoot)` triple — mirrors
 * `unitCoupling`'s `couplingCache`. The ConsumerGraph is frozen and there is
 * exactly one resolved `units` object per run, so a nested WeakMap is safe and
 * auto-clears. `units` is part of the key because a `MetricsReport` embeds
 * unit-aware names: `unitOf` buckets files differently per `units`, so a report
 * folded with one `units` map must not be returned for a call with a different
 * one.
 */
const reportCache = new WeakMap<ConsumerGraph, WeakMap<UnitsConfig, Map<string, MetricsReport>>>();

function cohesiveFilesOf(
  graph: ConsumerGraph,
  root: string,
  units: UnitsConfig,
): ReadonlySet<string> {
  const result = new Set<string>();
  for (const edge of graph.edges) {
    if (edge.consumer === edge.producer) continue;
    const consumerUnit = unitOf(edge.consumer, root, units);
    if (consumerUnit !== null && consumerUnit === unitOf(edge.producer, root, units)) {
      result.add(edge.consumer);
    }
  }
  return result;
}

function metricsOf(
  graph: ConsumerGraph,
  info: UnitCoupling,
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
    inboundSubsystems: info.inboundUnits,
    outboundSubsystems: info.outboundUnits,
    cohesiveEntityFiles,
    entityFiles,
  };
}

function computeReport(graph: ConsumerGraph, root: string, units: UnitsConfig): MetricsReport {
  const coupling = unitCoupling(graph, root, units);
  const cohesive = cohesiveFilesOf(graph, root, units);
  const report = new Map<string, SubsystemMetrics>();
  for (const [subsystem, info] of coupling) {
    report.set(subsystem, metricsOf(graph, info, cohesive));
  }
  return report;
}

/**
 * Every per-subsystem metric for the run, memoized on (graph, units,
 * sourceRoot) so the metrics rules trigger a single computation — mirrors
 * `unitCoupling`.
 */
export function analyzeMetrics(graph: ConsumerGraph, config: ResolvedConfig): MetricsReport {
  const root = config.project.sourceRoot;
  const units = config.units ?? NO_UNITS;
  let byUnits = reportCache.get(graph);
  if (byUnits === undefined) {
    byUnits = new WeakMap();
    reportCache.set(graph, byUnits);
  }
  let byRoot = byUnits.get(units);
  if (byRoot === undefined) {
    byRoot = new Map();
    byUnits.set(units, byRoot);
  }
  const cached = byRoot.get(root);
  if (cached !== undefined) return cached;
  const report = computeReport(graph, root, units);
  byRoot.set(root, report);
  return report;
}
