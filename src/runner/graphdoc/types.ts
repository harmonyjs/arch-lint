/**
 * @fileoverview Render-model types for the graph document — the GraphDoc tree
 * the model builds and the document/mermaid emitters consume.
 */
import type { ShapeFinding } from './shape/index.js';

/** arch-lint's classification of a file node — drives shape and visual weight. */
export type NodeRole =
  | 'entity-file'
  | 'component-folder'
  | 'barrel'
  | 'role-folder'
  | 'plain-file'
  | 'unresolved';

/** What a RenderNode stands for in a diagram. */
export type RenderNodeKind = 'file' | 'group' | 'port';

/** One node of one diagram. */
export interface RenderNode {
  /** Diagram-local mermaid-safe id (n0, n1, ...). */
  readonly id: string;
  /** The graph node id / file path this represents. */
  readonly path: string;
  /** Display name shown in the node label. */
  readonly name: string;
  readonly kind: RenderNodeKind;
  /** Role classification; 'plain-file' for non-file kinds. */
  readonly role: NodeRole;
  /** Layer key, or null when the node maps to no configured layer. */
  readonly layer: string | null;
  readonly placement: 'reactive' | 'explicit';
  /** Explicit-placement cluster name, or null. */
  readonly cluster: string | null;
  /** Full @fileoverview text, or null when absent. */
  readonly fileoverview: string | null;
  /** True when this node is in an import cycle (SCC size > 1). */
  readonly inCycle: boolean;
  /** Section slug a 'group'/'port' node links to; null for 'file' nodes. */
  readonly linkSlug: string | null;
}

/** One directed edge of one diagram. */
export interface RenderEdge {
  readonly fromId: string;
  readonly toId: string;
  /** True when the underlying import(s) are entirely type-only. */
  readonly typeOnly: boolean;
  /** True when this is the minority-weight direction of a cyclic pair. */
  readonly back: boolean;
  /** Aggregated edge weight (Overview); null on file-level diagrams. */
  readonly weight: number | null;
}

/** An inlined subgraph cluster within a diagram. */
export interface RenderCluster {
  readonly title: string;
  readonly nodeIds: readonly string[];
  readonly children: readonly RenderCluster[];
  /** %% note: the folder's barrel fileoverview, or null. */
  readonly note: string | null;
}

/** Subsystem coupling figures shown on an Overview node. */
export interface CouplingBadge {
  readonly ca: number;
  readonly ce: number;
  /** Instability I = ce / (ca + ce); 0 when both are 0. */
  readonly instability: number;
}

/** One diagram of one document section. */
export interface Diagram {
  readonly nodes: readonly RenderNode[];
  readonly edges: readonly RenderEdge[];
  readonly clusters: readonly RenderCluster[];
  /** Overview only: coupling badge keyed by RenderNode.id. */
  readonly coupling: ReadonlyMap<string, CouplingBadge>;
}

/** One section of the document — a heading plus its diagram. */
export interface DocSection {
  /** Heading text, e.g. "Overview", "rules", "rules / perfile". */
  readonly title: string;
  /** Markdown anchor slug, unique within the document. */
  readonly slug: string;
  /** Folder note for the section's leading %% comment, or null. */
  readonly note: string | null;
  readonly diagram: Diagram;
}

/** The whole render model — the Overview section first, then drill-downs. */
export interface GraphDoc {
  readonly sections: readonly DocSection[];
  readonly findings: readonly ShapeFinding[];
}
