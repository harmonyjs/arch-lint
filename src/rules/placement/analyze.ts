/**
 * @fileoverview analyzePlacement — sole owner of the §7.3 placement decision tree (D3).
 */
import type { ResolvedConfig } from '../../config/types.js';
import type { ConsumerGraph } from '../../graph/types.js';
import { componentParentOf, layerOf, lca } from './tree.js';

export interface PlacementVerdict {
  readonly entity: string;
  readonly ruleId: 'lca-placement' | 'slots-privacy' | 'siblings-forbidden' | 'empty-items-folder';
  readonly expected: string;
  readonly actual: string;
  readonly consumers: readonly string[];
  readonly reason: string;
}

type Conventions = ResolvedConfig['conventions'];

/** True when `id` is a strict descendant of `entity` in the path tree. */
function isDescendant(id: string, entity: string): boolean {
  return id.startsWith(`${entity}/`);
}

/** Consumers of `entity` with self-descendants removed (§7.2). */
function realConsumers(entity: string, graph: ConsumerGraph): readonly string[] {
  const raw = graph.entityConsumersOf.get(entity) ?? [];
  return raw.filter((c) => c !== entity && !isDescendant(c, entity));
}

/** Last path segment of `id` — the entity name. */
function nameOf(id: string): string {
  return id.split('/').at(-1)!;
}

/** True when any path segment of `id` equals `segment`. */
function isUnderSegment(id: string, segment: string): boolean {
  return id.split('/').includes(segment);
}

/** Promotion threshold from the lca-placement rule options (default 2). */
function promotionThreshold(config: ResolvedConfig): number {
  const raw = config.rules['lca-placement']?.['promotionThreshold'];
  return typeof raw === 'number' ? raw : 2;
}

/** Expected path for `entity` given its consumers; null when the rule abstains (§7.2). */
function expectedPlacement(
  entity: string,
  consumers: readonly string[],
  layerRoot: string,
  graph: ConsumerGraph,
  config: ResolvedConfig,
): string | null {
  const conv = config.conventions;
  if (consumers.length >= promotionThreshold(config)) {
    const host = lca(consumers, graph, conv) ?? layerRoot;
    return `${host}/${conv.sharedSegment}/${nameOf(entity)}`;
  }
  const owner = consumers[0]!;
  if (graph.nodes.get(owner)?.kind === 'file') return null; // a file has no slots/
  return `${owner}/${conv.privateSegment}/${nameOf(entity)}`;
}

/** True when some consumer shares the entity's component parent (sideways import). */
function hasSiblingConsumer(
  entity: string,
  consumers: readonly string[],
  graph: ConsumerGraph,
  conv: Conventions,
): boolean {
  if (isUnderSegment(entity, conv.privateSegment) || isUnderSegment(entity, conv.sharedSegment)) {
    return false;
  }
  const parent = componentParentOf(entity, graph, conv);
  if (parent === null) return false;
  return consumers.some((c) => componentParentOf(c, graph, conv) === parent);
}

/** Pick the §7.3 verdict ruleId for a misplaced entity — ordered branches 1-4. */
function classifyVerdict(
  entity: string,
  consumers: readonly string[],
  graph: ConsumerGraph,
  config: ResolvedConfig,
): PlacementVerdict['ruleId'] {
  const conv = config.conventions;
  if (isUnderSegment(entity, conv.privateSegment)) return 'slots-privacy';
  if (isUnderSegment(entity, conv.sharedSegment) && consumers.length < promotionThreshold(config)) {
    return 'empty-items-folder';
  }
  if (hasSiblingConsumer(entity, consumers, graph, conv)) return 'siblings-forbidden';
  return 'lca-placement';
}

/** Human-readable reason text per §7.3 branch. */
function reasonFor(
  ruleId: PlacementVerdict['ruleId'],
  consumers: readonly string[],
  sharedSegment: string,
): string {
  switch (ruleId) {
    case 'slots-privacy':
      return `entity in a private slot but imported by ${consumers.length} consumer(s)`;
    case 'empty-items-folder':
      return `shared ${sharedSegment}/ folder with only ${consumers.length} consumer(s)`;
    case 'siblings-forbidden':
      return 'sideways import between sibling branches';
    default:
      return `${consumers.length} consumer(s), entity outside its LCA`;
  }
}

/** Build the verdict for one in-layer entity; null when correctly placed (§7.2/§7.3). */
function computeVerdict(
  entity: string,
  consumers: readonly string[],
  layerRoot: string,
  graph: ConsumerGraph,
  config: ResolvedConfig,
): PlacementVerdict | null {
  const expected = expectedPlacement(entity, consumers, layerRoot, graph, config);
  if (expected === null || entity === expected) return null;
  const ruleId = classifyVerdict(entity, consumers, graph, config);
  return {
    entity,
    ruleId,
    expected,
    actual: entity,
    consumers,
    reason: reasonFor(ruleId, consumers, config.conventions.sharedSegment),
  };
}

/**
 * Apply the §7.2 cross-layer/no-consumer gate, returning the in-layer consumers and the
 * layer root, or null. An empty `layers` map is one implicit layer (the source root), so
 * no edge crosses a boundary; with explicit layers, all consumers must share the entity's.
 */
function gatedConsumers(
  entity: string,
  graph: ConsumerGraph,
  config: ResolvedConfig,
): { readonly consumers: readonly string[]; readonly layerRoot: string } | null {
  const consumers = realConsumers(entity, graph);
  if (consumers.length === 0) return null;
  const hasExplicitLayers = Object.keys(config.layers).length > 0;
  if (!hasExplicitLayers) {
    return { consumers, layerRoot: graph.rootDir };
  }
  const layer = layerOf(entity, config.layers);
  if (layer === null) return null;
  if (!consumers.every((c) => layerOf(c, config.layers) === layer)) return null;
  return { consumers, layerRoot: layer };
}

const cache = new WeakMap<ConsumerGraph, ReadonlyMap<string, PlacementVerdict>>();

/** Memoized §7.3 analysis over a frozen graph → entity → at most one PlacementVerdict (D3). */
export function analyzePlacement(
  graph: ConsumerGraph,
  config: ResolvedConfig,
): ReadonlyMap<string, PlacementVerdict> {
  const memo = cache.get(graph);
  if (memo !== undefined) return memo;
  const verdicts = new Map<string, PlacementVerdict>();
  for (const [id, node] of graph.nodes) {
    if (!node.isEntity || node.placementMode === 'explicit') continue;
    const gate = gatedConsumers(id, graph, config);
    if (gate === null) continue;
    const verdict = computeVerdict(id, gate.consumers, gate.layerRoot, graph, config);
    if (verdict !== null) verdicts.set(id, verdict);
  }
  cache.set(graph, verdicts);
  return verdicts;
}
