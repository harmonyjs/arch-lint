/**
 * @fileoverview Edge projection for buildGraphDoc — collapses parallel edges,
 * mints cross-section `port` nodes, projects unresolved imports, aggregates the
 * Overview subsystem edges with cyclic `back` tagging, and builds coupling badges.
 */
import { subsystemOf } from '#platform/graph/index.js';
import type { ConsumerGraph, UnresolvedImport } from '#platform/graph/types.js';
import type { CouplingBadge, RenderEdge, RenderNode } from '#runner/graphdoc/types.js';
import {
  baseNode,
  type IdMint,
  makeGroupNode,
  makeRenderNode,
  type ProjectionContext,
  type SectionBody,
} from './nodes.js';
import type { FolderTree } from './tree.js';

/** A directed pair key for edge collapsing. */
function pairKey(from: string, to: string): string {
  return `${from} ${to}`;
}

/** Collapses parallel raw edges into one RenderEdge per directed pair. */
function collapseEdges(
  raw: readonly { from: string; to: string; typeOnly: boolean }[],
): RenderEdge[] {
  const byPair = new Map<string, { from: string; to: string; typeOnly: boolean }>();
  for (const e of raw) {
    const key = pairKey(e.from, e.to);
    const prev = byPair.get(key);
    if (prev === undefined) {
      byPair.set(key, { ...e });
    } else {
      prev.typeOnly = prev.typeOnly && e.typeOnly;
    }
  }
  return [...byPair.values()].map((e) => ({
    fromId: e.from,
    toId: e.to,
    typeOnly: e.typeOnly,
    back: false,
    weight: null,
  }));
}

/** A `port` RenderNode standing for an out-of-section target group. */
function makePortNode(slug: string, mint: IdMint): RenderNode {
  return {
    ...baseNode(mint.next(), `port:${slug}`, `→ ${slug}`),
    kind: 'port',
    linkSlug: slug,
  };
}

/** The slug of the section a file id is rendered in (longest-prefix match). */
function sectionOf(fileId: string, ctx: ProjectionContext): string {
  let bestPath = ctx.root;
  let bestSlug = 'overview';
  for (const [path, slug] of ctx.sectionSlugs) {
    if (fileId.startsWith(`${path}/`) && path.length > bestPath.length) {
      bestPath = path;
      bestSlug = slug;
    }
  }
  return bestSlug;
}

/** Projects the runtime/type edges of a file-level section. */
export function projectFileEdges(
  body: SectionBody,
  mint: IdMint,
  ctx: ProjectionContext,
): { edges: RenderEdge[]; ports: RenderNode[] } {
  const ports = new Map<string, RenderNode>();
  const raw: { from: string; to: string; typeOnly: boolean }[] = [];
  for (const edge of ctx.graph.edges) {
    const consumer = body.byPath.get(edge.consumer);
    if (consumer === undefined) continue;
    const target = body.byPath.get(edge.producer);
    if (target !== undefined) {
      raw.push({ from: consumer.id, to: target.id, typeOnly: edge.typeOnly });
      continue;
    }
    const slug = sectionOf(edge.producer, ctx);
    let port = ports.get(slug);
    if (port === undefined) {
      port = makePortNode(slug, mint);
      ports.set(slug, port);
    }
    raw.push({ from: consumer.id, to: port.id, typeOnly: edge.typeOnly });
  }
  return { edges: collapseEdges(raw), ports: [...ports.values()] };
}

/** A RenderNode standing for an unresolved import specifier. */
function unresolvedNode(entry: UnresolvedImport, id: string): RenderNode {
  return {
    ...baseNode(id, entry.specifier, entry.specifier),
    role: 'unresolved',
    fileoverview: `unresolved (${entry.reason})`,
  };
}

/** Adds unresolved-import nodes and edges for the importers in a section. */
export function projectUnresolved(
  body: SectionBody,
  mint: IdMint,
  ctx: ProjectionContext,
): { nodes: RenderNode[]; edges: RenderEdge[] } {
  const nodes: RenderNode[] = [];
  const edges: RenderEdge[] = [];
  const seen = new Map<string, RenderNode>();
  const emitted = new Set<string>();
  for (const entry of ctx.graph.unresolved) {
    const importer = body.byPath.get(entry.file);
    if (importer === undefined) continue;
    let node = seen.get(entry.specifier);
    if (node === undefined) {
      node = unresolvedNode(entry, mint.next());
      seen.set(entry.specifier, node);
      nodes.push(node);
    }
    const key = pairKey(importer.id, node.id);
    if (emitted.has(key)) continue;
    emitted.add(key);
    edges.push({ fromId: importer.id, toId: node.id, typeOnly: false, back: false, weight: null });
  }
  return { nodes, edges };
}

/** Turns the weight map into RenderEdges, tagging the minority cyclic direction. */
function markBackEdges(
  counts: ReadonlyMap<string, { from: string; to: string; n: number }>,
): RenderEdge[] {
  const edges: RenderEdge[] = [];
  for (const e of counts.values()) {
    const reverse = counts.get(pairKey(e.to, e.from));
    const back = reverse !== undefined && (e.n < reverse.n || (e.n === reverse.n && e.from > e.to));
    edges.push({ fromId: e.from, toId: e.to, typeOnly: false, back, weight: e.n });
  }
  return edges;
}

/**
 * The Overview bucket key of a file: its subsystem folder name, or the file id
 * itself for a root-level file that belongs to no subsystem folder.
 */
function bucketOf(fileId: string, root: string): string {
  return subsystemOf(fileId, root) ?? fileId;
}

/** Aggregates the graph edges into subsystem→subsystem weighted edges. */
export function aggregateSubsystemEdges(
  graph: ConsumerGraph,
  root: string,
  byName: ReadonlyMap<string, RenderNode>,
): RenderEdge[] {
  const counts = new Map<string, { from: string; to: string; n: number }>();
  for (const edge of graph.edges) {
    const from = bucketOf(edge.consumer, root);
    const to = bucketOf(edge.producer, root);
    if (from === to) continue;
    const fromNode = byName.get(from);
    const toNode = byName.get(to);
    if (fromNode === undefined || toNode === undefined) continue;
    const key = pairKey(fromNode.id, toNode.id);
    const prev = counts.get(key);
    if (prev === undefined) {
      counts.set(key, { from: fromNode.id, to: toNode.id, n: 1 });
    } else {
      prev.n += 1;
    }
  }
  return markBackEdges(counts);
}

/** One Overview node per subsystem: a group node per folder, a file node per root file. */
export function overviewSubsystemNodes(
  tree: FolderTree,
  mint: IdMint,
  ctx: ProjectionContext,
): Map<string, RenderNode> {
  const byName = new Map<string, RenderNode>();
  for (const child of tree.folders.values()) {
    byName.set(child.name, makeGroupNode(child, mint, ctx));
  }
  for (const file of tree.files) {
    byName.set(bucketOf(file, ctx.root), makeRenderNode(file, mint, ctx));
  }
  return byName;
}

/** Builds a coupling badge with instability I = ce / (ce + ca). */
export function badgeOf(ce: number, ca: number): CouplingBadge {
  return { ce, ca, instability: ce + ca === 0 ? 0 : ce / (ce + ca) };
}
