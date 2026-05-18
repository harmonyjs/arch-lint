/**
 * @fileoverview Unit-coupling helper — folds the file-level ConsumerGraph into
 * per-unit coupling figures (efferent/afferent, membership, inbound/outbound
 * unit sets, inbound edge counts). A unit is declared in config (`units`); with
 * no declared units `unitOf` falls back to the first path segment so graphdoc
 * keeps grouping its diagram zero-config.
 */

import picomatch from 'picomatch';
import type { UnitsConfig } from '#foundation/config/types.js';
import { firstSegment } from '#foundation/entity-id/index.js';
import type { ConsumerGraph } from './types.js';

/** Per-unit coupling figures folded from the file-level ConsumerGraph. */
export interface UnitCoupling {
  /** Efferent coupling — distinct units this unit depends on. */
  readonly ce: number;
  /** Afferent coupling — distinct units that depend on this unit. */
  readonly ca: number;
  /** File ids that belong to this unit. */
  readonly files: ReadonlySet<string>;
  /** Units that import at least one file of this unit. */
  readonly inboundUnits: ReadonlySet<string>;
  /** Units this unit imports at least one file from. */
  readonly outboundUnits: ReadonlySet<string>;
  /** Total cross-unit edges that target a file of this unit. */
  readonly inboundEdges: number;
  /** The `typeOnly` subset of `inboundEdges`. */
  readonly inboundTypeOnlyEdges: number;
}

/** Mutable accumulator for a single unit while folding the graph. */
interface UnitAccumulator {
  readonly files: Set<string>;
  readonly inboundUnits: Set<string>;
  readonly outboundUnits: Set<string>;
  inboundEdges: number;
  inboundTypeOnlyEdges: number;
}

/** Length of a glob's leading wildcard-free prefix — its specificity for overlap resolution. */
function literalPrefixLength(glob: string): number {
  const star = glob.search(/[*?]/);
  return star === -1 ? glob.length : star;
}

/** A unit's glob precompiled into a matcher plus its overlap-resolution specificity. */
interface CompiledGlob {
  readonly matches: (path: string) => boolean;
  readonly prefixLength: number;
}

/**
 * Per-`units` compiled matchers. `picomatch.isMatch` recompiles its glob on
 * every call, and `unitOf` runs once per node and twice per edge, so each glob
 * is compiled once per declared `units` object and reused. `units` is frozen
 * and stable for the run, so a WeakMap is a safe, auto-clearing key.
 */
const compiledCache = new WeakMap<UnitsConfig, ReadonlyMap<string, readonly CompiledGlob[]>>();

/** Compiles every unit's glob(s) once, memoized on the `units` object. */
function compiledGlobsFor(units: UnitsConfig): ReadonlyMap<string, readonly CompiledGlob[]> {
  const cached = compiledCache.get(units);
  if (cached !== undefined) return cached;
  const compiled = new Map<string, readonly CompiledGlob[]>();
  for (const [name, value] of Object.entries(units)) {
    const globs = typeof value === 'string' ? [value] : value;
    compiled.set(
      name,
      globs.map((glob) => ({
        matches: picomatch(glob, { dot: true }),
        prefixLength: literalPrefixLength(glob),
      })),
    );
  }
  compiledCache.set(units, compiled);
  return compiled;
}

/**
 * The unit a file id belongs to. With declared `units`, the file id (relative to
 * `sourceRoot`) is matched against every unit's glob(s); the most specific match
 * wins — longest literal (wildcard-free) glob prefix, ties broken by declaration
 * order. With no declared units, falls back to the first path segment under
 * `sourceRoot`. A root-level file, or one matched by no glob, has no unit and
 * returns `null`. Does not consult `layers` — units and layers are orthogonal.
 */
export function unitOf(fileId: string, sourceRoot: string, units: UnitsConfig): string | null {
  const prefix = `${sourceRoot}/`;
  const rest = fileId.startsWith(prefix) ? fileId.slice(prefix.length) : fileId;
  const compiled = compiledGlobsFor(units);
  if (compiled.size === 0) {
    return rest.includes('/') ? firstSegment(rest) : null;
  }
  let best: string | null = null;
  let bestPrefixLength = -1;
  for (const [name, globs] of compiled) {
    for (const glob of globs) {
      if (!glob.matches(rest)) continue;
      if (glob.prefixLength > bestPrefixLength) {
        bestPrefixLength = glob.prefixLength;
        best = name;
      }
    }
  }
  return best;
}

/** Returns the accumulator for `name`, creating an empty one on first sight. */
function accumulatorFor(map: Map<string, UnitAccumulator>, name: string): UnitAccumulator {
  let acc = map.get(name);
  if (acc === undefined) {
    acc = {
      files: new Set(),
      inboundUnits: new Set(),
      outboundUnits: new Set(),
      inboundEdges: 0,
      inboundTypeOnlyEdges: 0,
    };
    map.set(name, acc);
  }
  return acc;
}

/**
 * Cache keyed on the `(graph, units, sourceRoot)` triple: every metric rule and
 * graphdoc fold the same graph with the same `units`, so the fold runs once and
 * is reused. The ConsumerGraph is frozen and there is exactly one resolved
 * `units` object per run, so a nested WeakMap is a safe, auto-clearing key.
 */
const couplingCache = new WeakMap<
  ConsumerGraph,
  WeakMap<UnitsConfig, Map<string, ReadonlyMap<string, UnitCoupling>>>
>();

/**
 * Folds the file-level ConsumerGraph into per-unit coupling figures. Every
 * `kind: 'file'` node that belongs to a unit contributes its membership; a file
 * with no unit is skipped. Every cross-unit edge records an outbound link on the
 * consumer unit, an inbound link on the producer unit, and increments the
 * producer unit's inbound edge counters (total and `typeOnly`). Memoized per
 * `(graph, units, sourceRoot)`.
 */
export function unitCoupling(
  graph: ConsumerGraph,
  sourceRoot: string,
  units: UnitsConfig,
): ReadonlyMap<string, UnitCoupling> {
  let byUnits = couplingCache.get(graph);
  if (byUnits === undefined) {
    byUnits = new WeakMap();
    couplingCache.set(graph, byUnits);
  }
  let byRoot = byUnits.get(units);
  if (byRoot === undefined) {
    byRoot = new Map();
    byUnits.set(units, byRoot);
  }
  const cached = byRoot.get(sourceRoot);
  if (cached !== undefined) return cached;

  const coupling = computeUnitCoupling(graph, sourceRoot, units);
  byRoot.set(sourceRoot, coupling);
  return coupling;
}

/** Performs the graph fold without caching — the body behind `unitCoupling`. */
function computeUnitCoupling(
  graph: ConsumerGraph,
  sourceRoot: string,
  units: UnitsConfig,
): ReadonlyMap<string, UnitCoupling> {
  const accumulators = new Map<string, UnitAccumulator>();

  for (const node of graph.nodes.values()) {
    if (node.kind !== 'file') continue;
    const unit = unitOf(node.id, sourceRoot, units);
    if (unit === null) continue;
    accumulatorFor(accumulators, unit).files.add(node.id);
  }

  for (const edge of graph.edges) {
    const consumerUnit = unitOf(edge.consumer, sourceRoot, units);
    const producerUnit = unitOf(edge.producer, sourceRoot, units);
    if (consumerUnit === null || producerUnit === null) continue;
    if (consumerUnit === producerUnit) continue;
    const producer = accumulatorFor(accumulators, producerUnit);
    accumulatorFor(accumulators, consumerUnit).outboundUnits.add(producerUnit);
    producer.inboundUnits.add(consumerUnit);
    producer.inboundEdges += 1;
    if (edge.typeOnly) producer.inboundTypeOnlyEdges += 1;
  }

  const coupling = new Map<string, UnitCoupling>();
  for (const [name, acc] of accumulators) {
    coupling.set(name, {
      ce: acc.outboundUnits.size,
      ca: acc.inboundUnits.size,
      files: acc.files,
      inboundUnits: acc.inboundUnits,
      outboundUnits: acc.outboundUnits,
      inboundEdges: acc.inboundEdges,
      inboundTypeOnlyEdges: acc.inboundTypeOnlyEdges,
    });
  }
  return coupling;
}
