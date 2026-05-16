/**
 * @fileoverview Entity-tree helpers — derive component parents, LCA and layer of an entity.
 */
import type { ConsumerGraph, ConventionsConfig, LayersConfig } from '../../types.js';

/** The role-segment subset of conventions — folders that are transparent in the tree. */
export type RoleConv = Pick<
  ConventionsConfig,
  'privateSegment' | 'sharedSegment' | 'libSegment' | 'hooksSegment'
  | 'explicitClusterSegment' | 'modelSegment'
>;

/** Ancestor path ids of `id`, nearest first (excluding `id` itself). */
function ancestors(id: string): readonly string[] {
  const segs = id.split('/');
  const out: string[] = [];
  for (let i = segs.length - 1; i > 0; i -= 1) {
    out.push(segs.slice(0, i).join('/'));
  }
  return out;
}

/**
 * Nearest ancestor entity of `entityId`; null when none exists. Role and plain folders
 * are skipped — they are never `isEntity` nodes, so node lookup already excludes them.
 */
export function componentParentOf(
  entityId: string,
  graph: ConsumerGraph,
  _conv: RoleConv,
): string | null {
  for (const anc of ancestors(entityId)) {
    if (graph.nodes.get(anc)?.isEntity === true) return anc;
  }
  return null;
}

/** Self + ancestor entity ids of `id`, ordered deepest-first. */
function entityChain(id: string, graph: ConsumerGraph): readonly string[] {
  const chain: string[] = [];
  if (graph.nodes.get(id)?.isEntity === true) chain.push(id);
  for (const anc of ancestors(id)) {
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
  if (entityIds.length === 0) return null;
  if (entityIds.length === 1) return componentParentOf(entityIds[0]!, graph, conv);
  let common: readonly string[] | null = null;
  for (const id of entityIds) {
    const chain = entityChain(id, graph);
    common = common === null ? chain : common.filter((c) => chain.includes(c));
  }
  // `common` is ordered deepest-first by construction of entityChain.
  return common !== null && common.length > 0 ? common[0]! : null;
}

/** True when `prefix` is a segment-wise prefix of `path` (or equal). */
function isSegmentPrefix(prefix: string, path: string): boolean {
  return path === prefix || path.startsWith(`${prefix}/`);
}

/** Layer key (longest segment-wise prefix) of `entityId`; null when none matches. */
export function layerOf(entityId: string, layers: LayersConfig): string | null {
  let best: string | null = null;
  for (const key of Object.keys(layers)) {
    if (isSegmentPrefix(key, entityId) && (best === null || key.length > best.length)) {
      best = key;
    }
  }
  return best;
}
