/**
 * @fileoverview Renders one DocSection as a single Mermaid flowchart block —
 * a pure string builder with no I/O and no dependencies beyond ./types.js.
 */
import type {
  Diagram,
  DocSection,
  NodeRole,
  RenderCluster,
  RenderEdge,
  RenderNode,
} from './types.js';

/** Max length of the fileoverview snippet appended to a file node label. */
const SUMMARY_MAX = 80;

/** Mermaid-escapes label text: drops newlines and escapes double quotes. */
function escapeLabel(text: string): string {
  return text.replace(/[\r\n]+/g, ' ').replace(/"/g, '&quot;');
}

/** Extracts the first sentence of a fileoverview, capped at SUMMARY_MAX chars. */
function firstSentence(text: string): string {
  const flat = text.replace(/[\r\n]+/g, ' ').trim();
  const dot = flat.indexOf('. ');
  const end = dot >= 0 ? dot + 1 : flat.length;
  return flat.slice(0, end).slice(0, SUMMARY_MAX);
}

/** Wrapping brackets for a node, keyed by structural kind then role. */
function bracketsFor(node: RenderNode): readonly [string, string] {
  if (node.kind === 'group') return ['[["', '"]]'];
  if (node.kind === 'port') return ['>"', '"]'];
  switch (node.role) {
    case 'component-folder':
      return ['[["', '"]]'];
    case 'barrel':
      return ['(["', '"])'];
    case 'role-folder':
      return ['{{"', '"}}'];
    default:
      return ['["', '"]'];
  }
}

/** Whether a node should carry the first-sentence fileoverview snippet. */
function showsSummary(node: RenderNode): boolean {
  return node.kind === 'file' && node.role !== 'barrel';
}

/** Builds the inner label text for a node (name + optional badges/snippet). */
function labelFor(node: RenderNode): string {
  const parts: string[] = [node.placement === 'explicit' ? `◆ ${node.name}` : node.name];
  if (showsSummary(node) && node.fileoverview !== null) {
    parts.push(firstSentence(node.fileoverview));
  }
  const badge = node.layer ?? node.cluster;
  if (badge !== null) parts.push(`[${badge}]`);
  return escapeLabel(parts.join('<br/>'));
}

/** Renders the `%% path: overview` comment line that precedes a node. */
function commentLine(node: RenderNode): string {
  const overview = node.fileoverview === null ? '(no @fileoverview)' : node.fileoverview;
  return `  %% ${node.path}: ${overview}`;
}

/** Renders one node — its comment line plus the bracketed declaration. */
function nodeBlock(node: RenderNode, indent: string): string {
  const [open, close] = bracketsFor(node);
  return `${indent}${commentLine(node).trimStart()}\n${indent}${node.id}${open}${labelFor(node)}${close}`;
}

/** Arrow body for an edge: solid for runtime, dashed for type-only. */
function arrowFor(edge: RenderEdge): string {
  const label = edge.back ? 'back' : edge.weight !== null ? String(edge.weight) : null;
  if (edge.typeOnly) {
    return label === null ? '-. .->' : `-. ${label} .->`;
  }
  return label === null ? '-->' : `-->|${label}|`;
}

/** Renders one edge line. */
function edgeLine(edge: RenderEdge): string {
  return `  ${edge.fromId} ${arrowFor(edge)} ${edge.toId}`;
}

/** Renders a cluster (and its children) as nested subgraph blocks. */
function clusterBlock(cluster: RenderCluster, byId: ReadonlyMap<string, RenderNode>): string[] {
  const lines: string[] = [];
  if (cluster.note !== null) lines.push(`  %% ${cluster.note}`);
  lines.push(`  subgraph ${cluster.title}`);
  for (const id of cluster.nodeIds) {
    const node = byId.get(id);
    if (node !== undefined) lines.push(nodeBlock(node, '    '));
  }
  for (const child of cluster.children) lines.push(...clusterBlock(child, byId));
  lines.push('  end');
  return lines;
}

/** Collects every node id that lives inside any cluster (recursively). */
function collectClusteredIds(clusters: readonly RenderCluster[], into: Set<string>): void {
  for (const cluster of clusters) {
    for (const id of cluster.nodeIds) into.add(id);
    collectClusteredIds(cluster.children, into);
  }
}

/** Stable class name for a node role. */
function roleClass(role: NodeRole): string {
  return `role-${role}`;
}

/** classDef statements for every role plus cycle and instability bands. */
function classDefs(roles: ReadonlySet<NodeRole>, hasInstability: boolean): string[] {
  const defs: string[] = [];
  for (const role of roles) {
    defs.push(`  classDef ${roleClass(role)} fill:#eef,stroke:#557;`);
  }
  defs.push('  classDef cycle fill:#fee,stroke:#c33,stroke-width:2px;');
  defs.push('  classDef unresolved fill:#fee,stroke:#c33,stroke-dasharray:4 2;');
  if (hasInstability) {
    defs.push('  classDef instability fill:#ffd,stroke:#aa5;');
  }
  return defs;
}

/** Picks the class applied to a node: cycle/unresolved override the role class. */
function classFor(node: RenderNode): string {
  if (node.inCycle) return 'cycle';
  if (node.role === 'unresolved') return 'unresolved';
  return roleClass(node.role);
}

/** `class` assignment lines for every node, plus instability-band tagging. */
function classAssignments(diagram: Diagram): string[] {
  const lines: string[] = [];
  for (const node of diagram.nodes) {
    lines.push(`  class ${node.id} ${classFor(node)};`);
    if (diagram.coupling.has(node.path)) {
      lines.push(`  class ${node.id} instability;`);
    }
  }
  return lines;
}

/** Renders one DocSection as a Mermaid flowchart (no surrounding fence). */
export function renderDiagram(section: DocSection): string {
  const { diagram } = section;
  const byId = new Map(diagram.nodes.map((n) => [n.id, n]));
  const clustered = new Set<string>();
  collectClusteredIds(diagram.clusters, clustered);

  const lines: string[] = ['flowchart LR'];
  for (const node of diagram.nodes) {
    if (!clustered.has(node.id)) lines.push(nodeBlock(node, '  '));
  }
  for (const cluster of diagram.clusters) lines.push(...clusterBlock(cluster, byId));
  for (const edge of diagram.edges) lines.push(edgeLine(edge));

  const roles = new Set(diagram.nodes.map((n) => n.role));
  lines.push(...classDefs(roles, diagram.coupling.size > 0));
  lines.push(...classAssignments(diagram));

  return lines.join('\n');
}
