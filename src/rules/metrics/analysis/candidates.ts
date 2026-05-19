/**
 * @fileoverview rankCandidateHomes / splitSuggestion — ranks the units that
 * could host a facet's symbol by the new unit→unit edges the move would add,
 * and builds the split Suggestion that carries that ranking.
 */
import type { ResolvedConfig, UnitsConfig } from '#foundation/config/types.js';
import type {
  CouplingFacetsAnalysis,
  Facet,
  RemedyCandidate,
  Suggestion,
} from '#foundation/types/index.js';
import { unitOf } from '#platform/graph/index.js';
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
  const deps = unitDependencies(graph, config.project.sourceRoot, config.units);
  const consumers = facet.units;
  const ranked = consumers
    .filter((host) => consumers.every((c) => canImport(c, host, config)))
    .map((host) => ({
      target: host,
      delta: consumers.filter((c) => c !== host && !(deps.get(c)?.has(host) ?? false)).length,
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
  if (analysis.facets.length === 0 || !analysis.disjoint) {
    return { action: 'split', rationale: 'split the unit by responsibility' };
  }
  const smallest = [...analysis.facets].sort((a, b) => a.units.length - b.units.length)[0];
  if (smallest === undefined)
    return { action: 'split', rationale: 'split the unit by responsibility' };
  const candidates = rankCandidateHomes(smallest, graph, config);
  return {
    action: 'split',
    rationale: `split along the seam — relocate ${smallest.symbol}`,
    ...(candidates.length > 0 ? { candidates } : {}),
  };
}

/** Builds unit → set of units it imports, from the file-level edges. */
function unitDependencies(
  graph: ConsumerGraph,
  root: string,
  units: UnitsConfig,
): Map<string, Set<string>> {
  const deps = new Map<string, Set<string>>();
  for (const edge of graph.edges) {
    const from = unitOf(edge.consumer, root, units);
    const to = unitOf(edge.producer, root, units);
    if (from === null || to === null || from === to) continue;
    const set = deps.get(from) ?? new Set<string>();
    set.add(to);
    deps.set(from, set);
  }
  return deps;
}

/** True when `consumerUnit`'s layer may import `hostUnit`'s layer. */
function canImport(consumerUnit: string, hostUnit: string, config: ResolvedConfig): boolean {
  const consumerLayer = consumerUnit.split('/')[0] ?? consumerUnit;
  const hostLayer = hostUnit.split('/')[0] ?? hostUnit;
  if (consumerLayer === hostLayer) return true;
  return (config.layers[consumerLayer]?.canImport ?? []).includes(hostLayer);
}
