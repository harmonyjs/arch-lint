/**
 * @fileoverview buildGraphDoc — projects arch-lint's internal ConsumerGraph into
 * a renderable GraphDoc: an Overview section of subsystem nodes plus a depth-first
 * walk of per-folder drill-down sections, each a single diagram.
 */
import type { ResolvedConfig } from '#foundation/config/types.js';
import { subsystemCoupling } from '#platform/graph/index.js';
import type { ConsumerGraph, Edge } from '#platform/graph/types.js';
import { cyclicNodes } from '#runner/graphdoc/scc.js';
import type { CouplingBadge, DocSection, GraphDoc } from '#runner/graphdoc/types.js';
import {
  aggregateSubsystemEdges,
  badgeOf,
  overviewSubsystemNodes,
  projectFileEdges,
  projectUnresolved,
} from './edges.js';
import { folderNote, IdMint, type ProjectionContext, projectSectionBody } from './nodes.js';
import { buildFolderTree, type FolderTree, sectionFolders, slugOf, titleOf } from './tree.js';

/** Options that narrow the document down from the whole graph. */
export interface BuildModelOptions {
  /** Limit the document to a single subsystem's section(s). */
  readonly subsystem?: string;
}

/** Builds one file-level drill-down section for a folder. */
function buildFileSection(folder: FolderTree, ctx: ProjectionContext): DocSection {
  const mint = new IdMint();
  const body = projectSectionBody(folder, mint, ctx);
  const { edges, ports } = projectFileEdges(body, mint, ctx);
  const unresolved = projectUnresolved(body, mint, ctx);
  const nodes = [...body.nodes, ...ports, ...unresolved.nodes];
  return {
    title: titleOf(folder.path, ctx.root),
    slug: slugOf(folder.path, ctx.root),
    note: folderNote(folder, ctx.fileoverviews),
    diagram: {
      nodes,
      edges: [...edges, ...unresolved.edges],
      clusters: body.clusters,
      coupling: new Map(),
    },
  };
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
