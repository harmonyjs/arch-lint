/**
 * @fileoverview GraphUnitsCache — a get-or-create memo over the
 * `(graph, units, sourceRoot)` key triple shared by every per-unit graph fold
 * (`unitCoupling`, `analyzeMetrics`). The ConsumerGraph and the resolved
 * `units` object are both frozen for the lifetime of a run, so the nested
 * WeakMaps are safe, auto-clearing keys; `sourceRoot` is an ordinary string
 * Map key.
 */
import type { UnitsConfig } from '#foundation/config/types.js';
import type { ConsumerGraph } from './types.js';

/** A memoized fold keyed on the `(graph, units, sourceRoot)` triple. */
export class GraphUnitsCache<V> {
  private readonly byGraph = new WeakMap<ConsumerGraph, WeakMap<UnitsConfig, Map<string, V>>>();

  /** Returns the cached value for the triple, computing and storing it on a miss. */
  get(graph: ConsumerGraph, units: UnitsConfig, sourceRoot: string, compute: () => V): V {
    let byUnits = this.byGraph.get(graph);
    if (byUnits === undefined) {
      byUnits = new WeakMap();
      this.byGraph.set(graph, byUnits);
    }
    let byRoot = byUnits.get(units);
    if (byRoot === undefined) {
      byRoot = new Map();
      byUnits.set(units, byRoot);
    }
    const cached = byRoot.get(sourceRoot);
    if (cached !== undefined) return cached;
    const value = compute();
    byRoot.set(sourceRoot, value);
    return value;
  }
}
