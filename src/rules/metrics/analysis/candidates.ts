/**
 * @fileoverview rankCandidateHomes / splitSuggestion — ranks the units that
 * could host a facet's symbol by the new unit→unit edges the move would add,
 * and builds the split Suggestion that carries that ranking.
 */
import type { ResolvedConfig } from '#foundation/config/types.js';
import type {
  CouplingFacetsAnalysis,
  Facet,
  RemedyCandidate,
  Suggestion,
} from '#foundation/types/index.js';
import { layerOf, unitCoupling, unitOf } from '#platform/graph/index.js';
import type { ConsumerGraph } from '#platform/graph/types.js';

/**
 * Ranks the facet's consumer units as candidate homes for its symbol. `delta`
 * is the count of the facet's other consumers that do not yet depend on the
 * candidate — the new unit edges the move would add. Layer-illegal hosts are
 * dropped. The minimum-delta candidate is flagged `best`.
 */
export function rankCandidateHomes(
  facet: Facet,
  graph: ConsumerGraph,
  config: ResolvedConfig,
): readonly RemedyCandidate[] {
  const coupling = unitCoupling(graph, config.project.sourceRoot, config.units);
  const layers = unitLayers(graph, config);
  const consumers = facet.units;
  const ranked = consumers
    .filter((host) => consumers.every((c) => canImport(c, host, layers, config)))
    .map((host) => ({
      target: host,
      delta: consumers.filter(
        (c) => c !== host && !(coupling.get(c)?.outboundUnits.has(host) ?? false),
      ).length,
    }))
    .sort((a, b) => a.delta - b.delta || a.target.localeCompare(b.target));
  return ranked.map((r, i) => ({
    target: r.target,
    note: `+${r.delta} new unit edge${r.delta === 1 ? '' : 's'}`,
    best: i === 0,
  }));
}

/**
 * Builds the split Suggestion for a facet analysis. When the facets are
 * disjoint there is a clean seam: relocate the smallest facet's symbol, with
 * ranked candidate homes. Otherwise the remedy is a plain split with no homes.
 */
export function splitSuggestion(
  analysis: CouplingFacetsAnalysis,
  graph: ConsumerGraph,
  config: ResolvedConfig,
): Suggestion {
  const plainSplit: Suggestion = {
    action: 'split',
    rationale: 'split the unit by responsibility',
  };
  if (analysis.facets.length === 0 || !analysis.disjoint) return plainSplit;
  const smallest = [...analysis.facets].sort((a, b) => a.units.length - b.units.length)[0];
  if (smallest === undefined) return plainSplit;
  const candidates = rankCandidateHomes(smallest, graph, config);
  return {
    action: 'split',
    rationale: `split along the seam — relocate ${smallest.symbol}`,
    ...(candidates.length > 0 ? { candidates } : {}),
  };
}

/** Resolves the layer of each unit touched by an edge, via the shared `layerOf`. */
function unitLayers(graph: ConsumerGraph, config: ResolvedConfig): Map<string, string | null> {
  const root = config.project.sourceRoot;
  const out = new Map<string, string | null>();
  for (const edge of graph.edges) {
    for (const file of [edge.consumer, edge.producer]) {
      const unit = unitOf(file, root, config.units);
      if (unit !== null && !out.has(unit)) out.set(unit, layerOf(file, config.layers, root));
    }
  }
  return out;
}

/** True when `consumerUnit`'s layer may import `hostUnit`'s layer. */
function canImport(
  consumerUnit: string,
  hostUnit: string,
  layers: ReadonlyMap<string, string | null>,
  config: ResolvedConfig,
): boolean {
  const consumerLayer = layers.get(consumerUnit) ?? null;
  const hostLayer = layers.get(hostUnit) ?? null;
  if (consumerLayer === null || hostLayer === null) return true;
  if (consumerLayer === hostLayer) return true;
  return (config.layers[consumerLayer]?.canImport ?? []).includes(hostLayer);
}
