/**
 * @fileoverview Node projection for buildGraphDoc — mints diagram-local ids,
 * classifies graph nodes into render roles, resolves per-node metadata, and
 * projects a folder's direct children into diagram nodes and clusters.
 */

import type { ResolvedConfig } from '#foundation/config/types.js';
import { baseNameOf, dirOf } from '#foundation/entity-id/index.js';
import { isRoleFolder, layerOf } from '#platform/graph/index.js';
import type { ConsumerGraph, Node } from '#platform/graph/types.js';
import type { NodeRole, RenderCluster, RenderNode } from '#runner/graphdoc/types.js';
import { type FolderTree, THRESHOLD } from './tree.js';

/** Mints diagram-local mermaid-safe ids (n0, n1, ...). */
export class IdMint {
  private counter = 0;
  next(): string {
    const id = `n${this.counter}`;
    this.counter += 1;
    return id;
  }
}

/** Recognised barrel basenames. */
const BARREL_NAMES = new Set(['index.ts', 'index.tsx']);

/** Base render role of a graph node before convention-folder adjustment. */
function baseRoleOf(node: Node): NodeRole {
  if (node.kind === 'folder') return 'component-folder';
  if (BARREL_NAMES.has(baseNameOf(node.id))) return 'barrel';
  if (node.isEntity) return 'entity-file';
  return 'plain-file';
}

/** The barrel fileoverview of a folder, or null when it has no documented barrel. */
export function folderNote(
  folder: FolderTree,
  fileoverviews: ReadonlyMap<string, string | null>,
): string | null {
  for (const file of folder.files) {
    if (BARREL_NAMES.has(baseNameOf(file))) {
      return fileoverviews.get(file) ?? null;
    }
  }
  return null;
}

/** A RenderNode shell carrying the inert defaults shared by every node kind. */
export function baseNode(id: string, path: string, name: string): RenderNode {
  return {
    id,
    path,
    name,
    kind: 'file',
    role: 'plain-file',
    layer: null,
    placement: 'reactive',
    cluster: null,
    fileoverview: null,
    inCycle: false,
    linkSlug: null,
  };
}

/** Shared inputs threaded through the per-section projection. */
export interface ProjectionContext {
  readonly graph: ConsumerGraph;
  readonly fileoverviews: ReadonlyMap<string, string | null>;
  readonly config: ResolvedConfig;
  readonly root: string;
  readonly cyclic: ReadonlySet<string>;
  /** folderPath → slug, for every folder that owns a section. */
  readonly sectionSlugs: ReadonlyMap<string, string>;
}

/** Role of a node, downgrading a file inside a convention folder to role-folder. */
function roleFromTree(id: string, node: Node, ctx: ProjectionContext): NodeRole {
  const base = baseRoleOf(node);
  if (base !== 'plain-file' && base !== 'entity-file') return base;
  if (isRoleFolder(baseNameOf(dirOf(id)), ctx.config.conventions)) return 'role-folder';
  return base;
}

/** Builds a RenderNode for a graph file/folder id. */
export function makeRenderNode(id: string, mint: IdMint, ctx: ProjectionContext): RenderNode {
  const node = ctx.graph.nodes.get(id);
  return {
    ...baseNode(mint.next(), id, baseNameOf(id)),
    role: node !== undefined ? roleFromTree(id, node, ctx) : 'plain-file',
    layer: layerOf(id, ctx.config.layers, ctx.root),
    placement: node?.placementMode ?? 'reactive',
    cluster: node?.cluster ?? null,
    fileoverview: node?.kind === 'file' ? (ctx.fileoverviews.get(id) ?? null) : null,
    inCycle: ctx.cyclic.has(id),
  };
}

/** Builds a `group` RenderNode that links to a child folder's own section. */
export function makeGroupNode(
  folder: FolderTree,
  mint: IdMint,
  ctx: ProjectionContext,
): RenderNode {
  return {
    ...baseNode(mint.next(), folder.path, folder.name),
    kind: 'group',
    linkSlug: ctx.sectionSlugs.get(folder.path) ?? null,
  };
}

/** A RenderCluster together with the RenderNodes minted while building it. */
export interface ClusterResult {
  readonly cluster: RenderCluster;
  readonly nodes: RenderNode[];
}

/** Builds a RenderCluster for a small subfolder, nesting smaller folders. */
function makeCluster(
  folder: FolderTree,
  mint: IdMint,
  ctx: ProjectionContext,
  byPath: Map<string, RenderNode>,
): ClusterResult {
  const nodes: RenderNode[] = [];
  const nodeIds: string[] = [];
  for (const id of [...folder.files, ...folder.folderNodes]) {
    const rn = makeRenderNode(id, mint, ctx);
    byPath.set(id, rn);
    nodes.push(rn);
    nodeIds.push(rn.id);
  }
  const children: RenderCluster[] = [];
  for (const child of folder.folders.values()) {
    const result = makeCluster(child, mint, ctx, byPath);
    children.push(result.cluster);
    nodes.push(...result.nodes);
  }
  return {
    cluster: {
      title: folder.name,
      nodeIds,
      children,
      note: folderNote(folder, ctx.fileoverviews),
    },
    nodes,
  };
}

/** The diagram body (nodes + clusters) of a file-level section. */
export interface SectionBody {
  readonly nodes: RenderNode[];
  readonly clusters: RenderCluster[];
  /** file id → its RenderNode, for edge projection. */
  readonly byPath: Map<string, RenderNode>;
}

/** Projects a folder's direct children into diagram nodes and clusters. */
export function projectSectionBody(
  folder: FolderTree,
  mint: IdMint,
  ctx: ProjectionContext,
): SectionBody {
  const nodes: RenderNode[] = [];
  const clusters: RenderCluster[] = [];
  const byPath = new Map<string, RenderNode>();
  for (const id of [...folder.files, ...folder.folderNodes]) {
    const rn = makeRenderNode(id, mint, ctx);
    byPath.set(id, rn);
    nodes.push(rn);
  }
  for (const child of folder.folders.values()) {
    if (child.subtreeSize > THRESHOLD) {
      nodes.push(makeGroupNode(child, mint, ctx));
    } else {
      const { cluster, nodes: clusterNodes } = makeCluster(child, mint, ctx, byPath);
      clusters.push(cluster);
      nodes.push(...clusterNodes);
    }
  }
  return { nodes, clusters, byPath };
}
