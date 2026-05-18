/**
 * @fileoverview analyzePlacement — sole owner of the placement decision tree.
 *
 * Two concerns, deliberately split:
 *  - `lca-placement` is the universal locality invariant: an entity must reside
 *    within the subtree rooted at the LCA of its consumers. It has no notion of
 *    role folders, so it is trivially satisfied on a flat entity tree.
 *  - `slots-privacy` / `empty-items-folder` / `siblings-forbidden` carry the
 *    role-folder convention (`slots/` private, `items/` shared) and fire only
 *    for entities physically inside one of those folders.
 */
import type { ResolvedConfig } from '#foundation/config/types.js';
import { isUnderSegment } from '#foundation/entity-id/index.js';
import { layerOf } from '#platform/graph/index.js';
import type { ConsumerGraph } from '#platform/graph/types.js';
import { componentParentOf, lca } from './tree.js';

export interface PlacementVerdict {
  readonly entity: string;
  readonly ruleId: 'lca-placement' | 'slots-privacy' | 'siblings-forbidden' | 'empty-items-folder';
  readonly expected: string;
  readonly actual: string;
  readonly consumers: readonly string[];
  readonly reason: string;
}

/**
 * The fixed inputs of a single entity's analysis — the graph, the resolved
 * config and the entity's layer root. Bundled so verdict functions stay within
 * the four-parameter budget.
 */
interface PlacementContext {
  readonly graph: ConsumerGraph;
  readonly config: ResolvedConfig;
  /** The entity's layer root — an explicit layer key, or the source root. */
  readonly layerRoot: string;
}

/** True when `id` is a strict descendant of `entity` in the path tree. */
function isDescendant(id: string, entity: string): boolean {
  return id.startsWith(`${entity}/`);
}

/** Consumers of `entity` with self-descendants removed. */
function realConsumers(entity: string, graph: ConsumerGraph): readonly string[] {
  const raw = graph.entityConsumersOf.get(entity) ?? [];
  return raw.filter((c) => c !== entity && !isDescendant(c, entity));
}

/** Last path segment of `id` — the entity name. */
function nameOf(id: string): string {
  const segs = id.split('/');
  // `String.prototype.split` always yields at least one element.
  return segs[segs.length - 1] ?? id;
}

/** True when `entity` sits within the subtree rooted at directory `root`. */
function isWithinSubtree(entity: string, root: string): boolean {
  return entity === root || isDescendant(entity, root);
}

/** Promotion threshold from the lca-placement rule options (default 2). */
function promotionThreshold(config: ResolvedConfig): number {
  const raw = config.rules['lca-placement']?.['promotionThreshold'];
  return typeof raw === 'number' ? raw : 2;
}

/**
 * The role-folder convention path for `entity` given its consumers: the shared
 * `items/` slot under the LCA when promoted, otherwise the owner's private
 * `slots/`. Null when the lone owner is a standalone file (a file has no slots/).
 */
function roleFolderExpected(
  entity: string,
  consumers: readonly string[],
  ctx: PlacementContext,
): string | null {
  const conv = ctx.config.conventions;
  if (consumers.length >= promotionThreshold(ctx.config)) {
    const host = lca(consumers, ctx.graph, conv) ?? ctx.layerRoot;
    return `${host}/${conv.sharedSegment}/${nameOf(entity)}`;
  }
  const owner = consumers[0];
  if (owner === undefined || ctx.graph.nodes.get(owner)?.kind === 'file') return null;
  return `${owner}/${conv.privateSegment}/${nameOf(entity)}`;
}

/** True when some consumer shares the entity's component parent (sideways import). */
function hasSiblingConsumer(
  entity: string,
  consumers: readonly string[],
  ctx: PlacementContext,
): boolean {
  const conv = ctx.config.conventions;
  if (isUnderSegment(entity, conv.privateSegment) || isUnderSegment(entity, conv.sharedSegment)) {
    return false;
  }
  const parent = componentParentOf(entity, ctx.graph, conv);
  if (parent === null) return false;
  return consumers.some((c) => componentParentOf(c, ctx.graph, conv) === parent);
}

/**
 * Pick the verdict ruleId for an entity — ordered branches 1-4. Branches 1-3
 * route role-folder / sibling cases; branch 4 is the universal locality rule.
 */
function classifyVerdict(
  entity: string,
  consumers: readonly string[],
  ctx: PlacementContext,
): PlacementVerdict['ruleId'] {
  const conv = ctx.config.conventions;
  if (isUnderSegment(entity, conv.privateSegment)) return 'slots-privacy';
  if (
    isUnderSegment(entity, conv.sharedSegment) &&
    consumers.length < promotionThreshold(ctx.config)
  ) {
    return 'empty-items-folder';
  }
  if (hasSiblingConsumer(entity, consumers, ctx)) return 'siblings-forbidden';
  return 'lca-placement';
}

/** Human-readable reason text per branch. */
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
      return `${consumers.length} consumer(s), entity outside its LCA subtree`;
  }
}

/**
 * The directory the entity's consumers root their LCA at: the LCA entity, or
 * the layer root when the consumers share no common entity ancestor.
 */
function lcaRoot(consumers: readonly string[], ctx: PlacementContext): string {
  return lca(consumers, ctx.graph, ctx.config.conventions) ?? ctx.layerRoot;
}

/** Build the lca-placement verdict; null when the entity is within its LCA subtree. */
function lcaVerdict(
  entity: string,
  consumers: readonly string[],
  ctx: PlacementContext,
): PlacementVerdict | null {
  const root = lcaRoot(consumers, ctx);
  if (isWithinSubtree(entity, root)) return null;
  return {
    entity,
    ruleId: 'lca-placement',
    expected: root,
    actual: entity,
    consumers,
    reason: reasonFor('lca-placement', consumers, ctx.config.conventions.sharedSegment),
  };
}

/** Build a role-folder verdict; null when the entity already sits at its role path. */
function roleVerdict(
  ruleId: 'slots-privacy' | 'siblings-forbidden' | 'empty-items-folder',
  entity: string,
  consumers: readonly string[],
  ctx: PlacementContext,
): PlacementVerdict | null {
  const expected = roleFolderExpected(entity, consumers, ctx);
  if (expected === null || entity === expected) return null;
  return {
    entity,
    ruleId,
    expected,
    actual: entity,
    consumers,
    reason: reasonFor(ruleId, consumers, ctx.config.conventions.sharedSegment),
  };
}

/** Build the verdict for one in-layer entity; null when correctly placed. */
function computeVerdict(
  entity: string,
  consumers: readonly string[],
  ctx: PlacementContext,
): PlacementVerdict | null {
  const ruleId = classifyVerdict(entity, consumers, ctx);
  if (ruleId === 'lca-placement') return lcaVerdict(entity, consumers, ctx);
  return roleVerdict(ruleId, entity, consumers, ctx);
}

/**
 * Apply the cross-layer / no-consumer gate, returning the in-layer consumers and
 * the layer root, or null. An empty `layers` map is one implicit layer (the
 * source root), so no edge crosses a boundary; with explicit layers, all
 * consumers must share the entity's.
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
    return { consumers, layerRoot: config.project.sourceRoot };
  }
  const sourceRoot = config.project.sourceRoot;
  const layer = layerOf(entity, config.layers, sourceRoot);
  if (layer === null) return null;
  if (!consumers.every((c) => layerOf(c, config.layers, sourceRoot) === layer)) return null;
  // `layer` is the sourceRoot-relative layer key; the layer root is its directory
  // path, which must carry the sourceRoot prefix to compare against entity ids.
  return { consumers, layerRoot: `${sourceRoot}/${layer}` };
}

const cache = new WeakMap<ConsumerGraph, ReadonlyMap<string, PlacementVerdict>>();

/** Memoized placement analysis over a frozen graph → entity → at most one verdict. */
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
    const ctx: PlacementContext = { graph, config, layerRoot: gate.layerRoot };
    const verdict = computeVerdict(id, gate.consumers, ctx);
    if (verdict !== null) verdicts.set(id, verdict);
  }
  cache.set(graph, verdicts);
  return verdicts;
}
