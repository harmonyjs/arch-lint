/**
 * @fileoverview Entity-tree helpers — derive component parents and LCA of an entity.
 */
import type { ConventionsConfig } from '#config/types.js';
import { ancestorsOf } from '#entity-id.js';
import type { ConsumerGraph } from '#graph/types.js';
/** The role-segment subset of conventions — folders that are transparent in the tree. */
export type RoleConv = Pick<
  ConventionsConfig,
  | 'privateSegment'
  | 'sharedSegment'
  | 'libSegment'
  | 'hooksSegment'
  | 'explicitClusterSegment'
  | 'modelSegment'
>;

/**
 * Nearest ancestor entity of `entityId`; null when none exists. Role and plain folders
 * are skipped — they are never `isEntity` nodes, so node lookup already excludes them.
 */
export function componentParentOf(
  entityId: string,
  graph: ConsumerGraph,
  _conv: RoleConv,
): string | null {
  for (const anc of ancestorsOf(entityId)) {
    if (graph.nodes.get(anc)?.isEntity === true) return anc;
  }
  return null;
}

/** Self + ancestor entity ids of `id`, ordered deepest-first. */
function entityChain(id: string, graph: ConsumerGraph): readonly string[] {
  const chain: string[] = [];
  if (graph.nodes.get(id)?.isEntity === true) chain.push(id);
  for (const anc of ancestorsOf(id)) {
    if (graph.nodes.get(anc)?.isEntity === true) chain.push(anc);
  }
  return chain;
}

/** Nearest common ancestor entity of `entityIds`; null when none exists. */
export function lca(
  entityIds: readonly string[],
  graph: ConsumerGraph,
  conv: RoleConv,
): string | null {
  const [first, ...rest] = entityIds;
  if (first === undefined) return null;
  if (rest.length === 0) return componentParentOf(first, graph, conv);
  let common: readonly string[] | null = null;
  for (const id of entityIds) {
    const chain = entityChain(id, graph);
    common = common === null ? chain : common.filter((c) => chain.includes(c));
  }
  // `common` is ordered deepest-first by construction of entityChain.
  return common?.[0] ?? null;
}
