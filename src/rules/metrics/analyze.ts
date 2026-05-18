/**
 * @fileoverview analyzeMetrics — computes every per-unit metric in one
 * pass: afferent/efferent coupling, instability, abstractness and internal
 * cohesion. Memoized per (graph, units, sourceRoot) so the metrics rules share
 * one computation.
 */
import type { ResolvedConfig, UnitsConfig } from '#foundation/config/types.js';
import { type UnitCoupling, unitCoupling, unitOf } from '#platform/graph/index.js';
import type { ConsumerGraph } from '#platform/graph/types.js';

/** Every metric arch-lint measures for one unit. */
export interface UnitMetrics {
  readonly ca: number;
  readonly ce: number;
  readonly instability: number;
  readonly abstractness: number;
  readonly inboundUnits: ReadonlySet<string>;
  readonly outboundUnits: ReadonlySet<string>;
  readonly cohesiveEntityFiles: number;
  readonly entityFiles: number;
}

/** Per-unit metrics for one run, keyed by unit name. */
export type MetricsReport = ReadonlyMap<string, UnitMetrics>;

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
): UnitMetrics {
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
    abstractness: info.inboundEdges === 0 ? 1 : info.inboundTypeOnlyEdges / info.inboundEdges,
    inboundUnits: info.inboundUnits,
    outboundUnits: info.outboundUnits,
    cohesiveEntityFiles,
    entityFiles,
  };
}

function computeReport(graph: ConsumerGraph, root: string, units: UnitsConfig): MetricsReport {
  const coupling = unitCoupling(graph, root, units);
  const cohesive = cohesiveFilesOf(graph, root, units);
  const report = new Map<string, UnitMetrics>();
  for (const [unit, info] of coupling) {
    report.set(unit, metricsOf(graph, info, cohesive));
  }
  return report;
}

/**
 * Every per-unit metric for the run, memoized on (graph, units, sourceRoot) so
 * the metrics rules trigger a single computation — mirrors `unitCoupling`.
 */
export function analyzeMetrics(graph: ConsumerGraph, config: ResolvedConfig): MetricsReport {
  const root = config.project.sourceRoot;
  const units = config.units;
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
