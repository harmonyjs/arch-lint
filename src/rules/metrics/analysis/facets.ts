/**
 * @fileoverview couplingFacets — decomposes a unit's cross-boundary coupling
 * into facets: groups of opposite-end units linked through the same imported
 * symbol. Disjoint facets are a mechanical signal of split responsibility.
 */
import type { ResolvedConfig } from '#foundation/config/types.js';
import type { CouplingFacetsAnalysis, Facet } from '#foundation/types/index.js';
import { unitOf } from '#platform/graph/index.js';
import type { ConsumerGraph } from '#platform/graph/types.js';

/** Which boundary direction the facets describe. */
export type CouplingDirection = 'inbound' | 'outbound';

/**
 * Decomposes `unit`'s cross-boundary edges into facets. For 'inbound', groups
 * the units that depend on `unit` by the symbol they import; for 'outbound',
 * groups the units `unit` depends on by the symbol it imports from them.
 */
export function couplingFacets(
  unit: string,
  graph: ConsumerGraph,
  config: ResolvedConfig,
  direction: CouplingDirection,
): CouplingFacetsAnalysis {
  const root = config.project.sourceRoot;
  const units = config.units;
  const bySymbol = new Map<string, Set<string>>();
  for (const edge of graph.edges) {
    const consumerUnit = unitOf(edge.consumer, root, units);
    const producerUnit = unitOf(edge.producer, root, units);
    const near = direction === 'inbound' ? producerUnit : consumerUnit;
    const far = direction === 'inbound' ? consumerUnit : producerUnit;
    if (near !== unit || far === null || far === unit) continue;
    const group = bySymbol.get(edge.symbol) ?? new Set<string>();
    group.add(far);
    bySymbol.set(edge.symbol, group);
  }
  const facets: Facet[] = [...bySymbol]
    .map(([symbol, set]) => ({ symbol, units: [...set].sort() }))
    .sort((a, b) => a.symbol.localeCompare(b.symbol));
  return { kind: 'coupling-facets', facets, disjoint: areDisjoint(facets) };
}

/** True when no unit appears in more than one facet. */
function areDisjoint(facets: readonly Facet[]): boolean {
  const seen = new Set<string>();
  for (const facet of facets) {
    for (const unit of facet.units) {
      if (seen.has(unit)) return false;
      seen.add(unit);
    }
  }
  return true;
}
