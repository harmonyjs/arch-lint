/**
 * @fileoverview buildGraphDoc — projects arch-lint's internal ConsumerGraph into
 * a renderable GraphDoc: an Overview section of subsystem nodes plus a depth-first
 * walk of per-folder drill-down sections, each a single diagram.
 */
import type { ResolvedConfig } from '../config/types.js';
import { layerOf, subsystemCoupling, subsystemOf } from '../graph/index.js';
import type { ConsumerGraph, Edge, Node, UnresolvedImport } from '../graph/types.js';
import { cyclicNodes } from './scc.js';
import type {
  CouplingBadge,
  DocSection,
  GraphDoc,
  NodeRole,
  RenderCluster,
  RenderEdge,
  RenderNode,
} from './types.js';

/** A folder gets its own section once its file count exceeds this threshold. */
const THRESHOLD = 18;

/** Options that narrow the document down from the whole graph. */
export interface BuildModelOptions {
  /** Limit the document to a single subsystem's section(s). */
  readonly subsystem?: string;
}

/** A folder of the tree implied by the graph's file ids. */
interface FolderTree {
  /** POSIX path of the folder (the source root for the tree root). */
  readonly path: string;
  /** Last path segment — the display name. */
  readonly name: string;
  readonly folders: Map<string, FolderTree>;
  /** File ids directly inside this folder. */
  readonly files: string[];
  /** Ids of `kind: 'folder'` graph nodes directly inside this folder. */
  readonly folderNodes: string[];
  /** Count of file graph nodes anywhere beneath this folder. */
  subtreeSize: number;
}

/** Mints diagram-local mermaid-safe ids (n0, n1, ...). */
class IdMint {
  private counter = 0;
  next(): string {
    const id = `n${this.counter}`;
    this.counter += 1;
    return id;
  }
}

/** Creates an empty folder node for `path`. */
function emptyFolder(path: string): FolderTree {
  const slash = path.lastIndexOf('/');
  return {
    path,
    name: slash === -1 ? path : path.slice(slash + 1),
    folders: new Map(),
    files: [],
    folderNodes: [],
    subtreeSize: 0,
  };
}

/** Walks/creates the folder that holds the parent of `id` and returns it. */
function parentFolder(root: FolderTree, id: string): FolderTree {
  const rel = id.slice(root.path.length + 1);
  const segments = rel.split('/');
  let folder = root;
  for (let i = 0; i < segments.length - 1; i += 1) {
    const childPath = `${folder.path}/${segments[i]}`;
    let child = folder.folders.get(childPath);
    if (child === undefined) {
      child = emptyFolder(childPath);
      folder.folders.set(childPath, child);
    }
    folder = child;
  }
  return folder;
}

/** Inserts a `kind: 'file'` graph node into the folder tree. */
function insertFile(root: FolderTree, fileId: string): void {
  parentFolder(root, fileId).files.push(fileId);
}

/** Inserts a `kind: 'folder'` graph node as a leaf entity of its parent. */
function insertFolderNode(root: FolderTree, folderId: string): void {
  parentFolder(root, folderId).folderNodes.push(folderId);
}

/** Fills in `subtreeSize` for every folder; returns the folder's own size. */
function sizeTree(folder: FolderTree): number {
  let size = folder.files.length;
  for (const child of folder.folders.values()) size += sizeTree(child);
  folder.subtreeSize = size;
  return size;
}

/** Builds the folder tree of every graph node under `root`. */
function buildFolderTree(graph: ConsumerGraph, root: string): FolderTree {
  const tree = emptyFolder(root);
  const prefix = `${root}/`;
  for (const node of graph.nodes.values()) {
    if (!node.id.startsWith(prefix)) continue;
    if (node.kind === 'file') insertFile(tree, node.id);
    else insertFolderNode(tree, node.id);
  }
  sizeTree(tree);
  return tree;
}

/** Slug of a folder path: `/` → `-`; the source root maps to `overview`. */
function slugOf(folderPath: string, root: string): string {
  if (folderPath === root) return 'overview';
  return folderPath.slice(root.length + 1).replace(/\//g, '-');
}

/** Heading title of a folder: `root` → "Overview", else slash-separated. */
function titleOf(folderPath: string, root: string): string {
  if (folderPath === root) return 'Overview';
  return folderPath.slice(root.length + 1).replace(/\//g, ' / ');
}

/** A folder owns a section when it is a subsystem root or exceeds THRESHOLD. */
function ownsSection(folder: FolderTree, root: string): boolean {
  return (
    folder.path !== root &&
    (folder.path.indexOf('/', root.length + 1) === -1 || folder.subtreeSize > THRESHOLD)
  );
}

/** Depth-first list of folders that own a drill-down section. */
function sectionFolders(tree: FolderTree, root: string): FolderTree[] {
  const out: FolderTree[] = [];
  const visit = (folder: FolderTree): void => {
    for (const child of folder.folders.values()) {
      if (ownsSection(child, root)) out.push(child);
      visit(child);
    }
  };
  visit(tree);
  return out;
}

/** Recognised barrel basenames. */
const BARREL_NAMES = new Set(['index.ts', 'index.tsx']);

/** Basename of a path. */
function basename(path: string): string {
  const slash = path.lastIndexOf('/');
  return slash === -1 ? path : path.slice(slash + 1);
}

/** True when a folder name matches one of the configured convention segments. */
function isRoleFolder(name: string, config: ResolvedConfig): boolean {
  const c = config.conventions;
  return (
    name === c.privateSegment ||
    name === c.sharedSegment ||
    name === c.libSegment ||
    name === c.hooksSegment ||
    name === c.explicitClusterSegment ||
    name === c.modelSegment
  );
}

/** Base render role of a graph node before convention-folder adjustment. */
function baseRoleOf(node: Node): NodeRole {
  if (node.kind === 'folder') return 'component-folder';
  if (BARREL_NAMES.has(basename(node.id))) return 'barrel';
  if (node.isEntity) return 'entity-file';
  return 'plain-file';
}

/** The barrel fileoverview of a folder, or null when it has no documented barrel. */
function folderNote(
  folder: FolderTree,
  fileoverviews: ReadonlyMap<string, string | null>,
): string | null {
  for (const file of folder.files) {
    if (BARREL_NAMES.has(basename(file))) {
      return fileoverviews.get(file) ?? null;
    }
  }
  return null;
}

/** A RenderNode shell carrying the inert defaults shared by every node kind. */
function baseNode(id: string, path: string, name: string): RenderNode {
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

/** Builds a RenderNode for a graph file/folder id. */
function makeRenderNode(id: string, mint: IdMint, ctx: ProjectionContext): RenderNode {
  const node = ctx.graph.nodes.get(id);
  return {
    ...baseNode(mint.next(), id, basename(id)),
    role: node !== undefined ? roleFromTree(id, node, ctx) : 'plain-file',
    layer: layerOf(id, ctx.config.layers),
    placement: node?.placementMode ?? 'reactive',
    cluster: node?.cluster ?? null,
    fileoverview: node?.kind === 'file' ? (ctx.fileoverviews.get(id) ?? null) : null,
    inCycle: ctx.cyclic.has(id),
  };
}

/** Role of a node, downgrading a file inside a convention folder to role-folder. */
function roleFromTree(id: string, node: Node, ctx: ProjectionContext): NodeRole {
  const base = baseRoleOf(node);
  if (base !== 'plain-file' && base !== 'entity-file') return base;
  const dir = id.slice(0, id.lastIndexOf('/'));
  if (isRoleFolder(basename(dir), ctx.config)) return 'role-folder';
  return base;
}

/** Shared inputs threaded through the per-section projection. */
interface ProjectionContext {
  readonly graph: ConsumerGraph;
  readonly fileoverviews: ReadonlyMap<string, string | null>;
  readonly config: ResolvedConfig;
  readonly root: string;
  readonly cyclic: ReadonlySet<string>;
  /** folderPath → slug, for every folder that owns a section. */
  readonly sectionSlugs: ReadonlyMap<string, string>;
}

/** Builds a RenderCluster for a small subfolder, nesting smaller folders. */
function makeCluster(
  folder: FolderTree,
  mint: IdMint,
  ctx: ProjectionContext,
  byPath: Map<string, RenderNode>,
): RenderCluster {
  const nodeIds: string[] = [];
  for (const id of [...folder.files, ...folder.folderNodes]) {
    const rn = makeRenderNode(id, mint, ctx);
    byPath.set(id, rn);
    nodeIds.push(rn.id);
  }
  const children: RenderCluster[] = [];
  for (const child of folder.folders.values()) {
    children.push(makeCluster(child, mint, ctx, byPath));
  }
  return {
    title: folder.name,
    nodeIds,
    children,
    note: folderNote(folder, ctx.fileoverviews),
  };
}

/** Builds a `group` RenderNode that links to a child folder's own section. */
function makeGroupNode(folder: FolderTree, mint: IdMint, ctx: ProjectionContext): RenderNode {
  return {
    ...baseNode(mint.next(), folder.path, folder.name),
    kind: 'group',
    linkSlug: ctx.sectionSlugs.get(folder.path) ?? null,
  };
}

/** The diagram body (nodes + clusters) of a file-level section. */
interface SectionBody {
  readonly nodes: RenderNode[];
  readonly clusters: RenderCluster[];
  /** file id → its RenderNode, for edge projection. */
  readonly byPath: Map<string, RenderNode>;
}

/** Projects a folder's direct children into diagram nodes and clusters. */
function projectSectionBody(folder: FolderTree, mint: IdMint, ctx: ProjectionContext): SectionBody {
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
      const cluster = makeCluster(child, mint, ctx, byPath);
      clusters.push(cluster);
      nodes.push(...byPath.values());
    }
  }
  const deduped = [...new Map(nodes.map((n) => [n.id, n])).values()];
  return { nodes: deduped, clusters, byPath };
}

/** A directed pair key for edge collapsing. */
function pairKey(from: string, to: string): string {
  return `${from} ${to}`;
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
function projectFileEdges(
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

/** Adds unresolved-import nodes and edges for the importers in a section. */
function projectUnresolved(
  body: SectionBody,
  mint: IdMint,
  ctx: ProjectionContext,
): { nodes: RenderNode[]; edges: RenderEdge[]; reasons: string[] } {
  const nodes: RenderNode[] = [];
  const edges: RenderEdge[] = [];
  const reasons: string[] = [];
  const seen = new Map<string, RenderNode>();
  for (const entry of ctx.graph.unresolved) {
    const importer = body.byPath.get(entry.file);
    if (importer === undefined) continue;
    let node = seen.get(entry.specifier);
    if (node === undefined) {
      node = unresolvedNode(entry, mint.next());
      seen.set(entry.specifier, node);
      nodes.push(node);
      reasons.push(`unresolved import ${entry.specifier} (${entry.reason})`);
    }
    edges.push({ fromId: importer.id, toId: node.id, typeOnly: false, back: false, weight: null });
  }
  return { nodes, edges, reasons };
}

/** A RenderNode standing for an unresolved import specifier. */
function unresolvedNode(entry: UnresolvedImport, id: string): RenderNode {
  return { ...baseNode(id, entry.specifier, entry.specifier), role: 'unresolved' };
}

/** Builds one file-level drill-down section for a folder. */
function buildFileSection(folder: FolderTree, ctx: ProjectionContext): DocSection {
  const mint = new IdMint();
  const body = projectSectionBody(folder, mint, ctx);
  const { edges, ports } = projectFileEdges(body, mint, ctx);
  const unresolved = projectUnresolved(body, mint, ctx);
  const nodes = [...body.nodes, ...ports, ...unresolved.nodes];
  const note =
    unresolved.reasons.length > 0
      ? unresolved.reasons.join('; ')
      : folderNote(folder, ctx.fileoverviews);
  return {
    title: titleOf(folder.path, ctx.root),
    slug: slugOf(folder.path, ctx.root),
    note,
    diagram: {
      nodes,
      edges: [...edges, ...unresolved.edges],
      clusters: body.clusters,
      coupling: new Map(),
    },
  };
}

/** Aggregates the graph edges into subsystem→subsystem weighted edges. */
function aggregateSubsystemEdges(
  graph: ConsumerGraph,
  root: string,
  byName: ReadonlyMap<string, RenderNode>,
): RenderEdge[] {
  const counts = new Map<string, { from: string; to: string; n: number }>();
  for (const edge of graph.edges) {
    const from = subsystemOf(edge.consumer, root);
    const to = subsystemOf(edge.producer, root);
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

/** One Overview node per subsystem: a group node per folder, a file node per root file. */
function overviewSubsystemNodes(
  tree: FolderTree,
  mint: IdMint,
  ctx: ProjectionContext,
): Map<string, RenderNode> {
  const byName = new Map<string, RenderNode>();
  for (const child of tree.folders.values()) {
    byName.set(child.name, makeGroupNode(child, mint, ctx));
  }
  for (const file of tree.files) {
    byName.set(subsystemOf(file, ctx.root), makeRenderNode(file, mint, ctx));
  }
  return byName;
}

/** Builds the Overview section: one node per subsystem, weighted edges, coupling. */
function buildOverviewSection(ctx: ProjectionContext, tree: FolderTree): DocSection {
  const mint = new IdMint();
  const coupling = subsystemCoupling(ctx.graph, ctx.root);
  const badges = new Map<string, CouplingBadge>();
  const byName = overviewSubsystemNodes(tree, mint, ctx);
  const nodes = [...byName.values()];
  for (const [name, node] of byName) {
    const c = coupling.get(name);
    if (c !== undefined) badges.set(node.id, badgeOf(c.ce, c.ca));
  }
  const edges = aggregateSubsystemEdges(ctx.graph, ctx.root, byName);
  return {
    title: 'Overview',
    slug: 'overview',
    note: folderNote(tree, ctx.fileoverviews),
    diagram: { nodes, edges, clusters: [], coupling: badges },
  };
}

/** Builds a coupling badge with instability I = ce / (ce + ca). */
function badgeOf(ce: number, ca: number): CouplingBadge {
  return { ce, ca, instability: ce + ca === 0 ? 0 : ce / (ce + ca) };
}

/** Builds the file-level adjacency map (consumer → producers) for cycle detection. */
function buildAdjacency(edges: readonly Edge[]): ReadonlyMap<string, readonly string[]> {
  const adjacency = new Map<string, string[]>();
  for (const edge of edges) {
    const bucket = adjacency.get(edge.consumer);
    if (bucket === undefined) adjacency.set(edge.consumer, [edge.producer]);
    else bucket.push(edge.producer);
  }
  return adjacency;
}

/** True when a section's slug is the requested subsystem or nested under it. */
function inSubsystem(slug: string, subsystem: string): boolean {
  return slug === subsystem || slug.startsWith(`${subsystem}-`);
}

/** Projects a ConsumerGraph into a layered GraphDoc render model. */
export function buildGraphDoc(
  graph: ConsumerGraph,
  fileoverviews: ReadonlyMap<string, string | null>,
  config: ResolvedConfig,
  options?: BuildModelOptions,
): GraphDoc {
  const root = config.project.sourceRoot;
  const tree = buildFolderTree(graph, root);
  const folders = sectionFolders(tree, root);
  const sectionSlugs = new Map<string, string>();
  for (const folder of folders) sectionSlugs.set(folder.path, slugOf(folder.path, root));

  const ctx: ProjectionContext = {
    graph,
    fileoverviews,
    config,
    root,
    cyclic: cyclicNodes(buildAdjacency(graph.edges)),
    sectionSlugs,
  };

  const drilldowns = folders.map((folder) => buildFileSection(folder, ctx));
  const subsystem = options?.subsystem;
  if (subsystem !== undefined) {
    return { sections: drilldowns.filter((s) => inSubsystem(s.slug, subsystem)) };
  }
  return { sections: [buildOverviewSection(ctx, tree), ...drilldowns] };
}
