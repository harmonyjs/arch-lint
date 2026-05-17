/**
 * @fileoverview barrel-is-public-face rule — an external file must import a component's
 * entity through its barrel, not a folder internal directly (decision D7). Works on edges.
 */
import type { ResolvedConfig } from '../../../config/types.js';
import type { ConsumerGraph, Edge } from '../../../graph/types.js';
import type { Diagnostic, Rule, RuleContext } from '../../../types.js';
import { dedupByFingerprint } from '../../syntactic-support/dedup.js';
import { componentFolderOf, isBarrelFile } from '../../syntactic-support/node-helpers.js';
import { enforceForSegmentsMatches, segmentsOf } from '../../syntactic-support/segments.js';

/** Options of barrel-is-public-face (D7). */
export interface BarrelIsPublicFaceOptions {
  readonly enforceForSegments: 'all' | readonly string[];
  readonly allowExplicitIndex: boolean;
  readonly allowSiblingImports: boolean;
}

/** The kind of barrel-boundary violation an edge carries, if any. */
type Verdict = 'bypass' | 'sibling' | 'explicit-index';

/** Every component-folder id of the graph. */
function componentFolders(graph: ConsumerGraph): Set<string> {
  const out = new Set<string>();
  for (const node of graph.nodes.values()) {
    if (node.kind === 'folder') out.add(node.id);
  }
  return out;
}

/** Every conventions.*Segment value. */
function knownSegments(config: ResolvedConfig): string[] {
  const c = config.conventions;
  return [
    c.privateSegment,
    c.sharedSegment,
    c.libSegment,
    c.hooksSegment,
    c.explicitClusterSegment,
    c.modelSegment,
  ];
}

/** True when the import path points straight at an index file. */
function pathPointsAtIndex(syntacticPath: string | undefined): boolean {
  if (syntacticPath === undefined) return false;
  return /(^|\/)index(\.tsx?)?$/.test(syntacticPath);
}

/** True when a file lies inside a folder (per-segment prefix, strictly deeper). */
function isInside(fileId: string, folderId: string): boolean {
  const fileSegs = segmentsOf(fileId);
  const folderSegs = segmentsOf(folderId);
  if (fileSegs.length <= folderSegs.length) return false;
  return folderSegs.every((s, i) => fileSegs[i] === s);
}

/** Classifies one edge against the barrel boundary; null when legal. */
function evaluateEdge(
  edge: Edge,
  folders: Set<string>,
  config: ResolvedConfig,
  options: BarrelIsPublicFaceOptions,
): Verdict | null {
  const producerFolder = componentFolderOf(edge.producer, folders);
  if (producerFolder === null) return null;
  if (
    !enforceForSegmentsMatches(options.enforceForSegments, edge.producer, knownSegments(config))
  ) {
    return null;
  }
  const producerIsBarrel =
    isBarrelFile(edge.producer, config.conventions) &&
    segmentsOf(edge.producer).slice(0, -1).join('/') === producerFolder;
  if (producerIsBarrel) {
    if (!options.allowExplicitIndex && pathPointsAtIndex(edge.syntacticPath)) {
      return 'explicit-index';
    }
    return null;
  }
  if (isInside(edge.consumer, producerFolder)) {
    return options.allowSiblingImports ? null : 'sibling';
  }
  return 'bypass';
}

/** The human-readable message for a verdict. */
function messageFor(kind: Verdict, edge: Edge, folder: string): string {
  if (kind === 'explicit-index') {
    return `Import '${edge.syntacticPath}' targets the barrel by explicit index path; import the folder '${folder}' instead`;
  }
  if (kind === 'sibling') {
    return `Sibling import of '${edge.producer}' bypasses the barrel of '${folder}'`;
  }
  return `External file imports '${edge.producer}' bypassing the barrel of '${folder}'`;
}

/** Builds the diagnostic for one barrel-boundary violation. */
function bypassDiagnostic(
  edge: Edge,
  verdict: Verdict,
  folder: string,
  context: RuleContext<BarrelIsPublicFaceOptions>,
): Diagnostic {
  return {
    ruleId: context.ruleId,
    severity: context.severity,
    entity: edge.consumer,
    fingerprint: `${edge.consumer}#${edge.producer}`,
    message: messageFor(verdict, edge, folder),
    actual: `import from '${edge.syntacticPath ?? edge.producer}'`,
    expected: `import from '${folder}'`,
    reason: 'A component-folder is encapsulated by its barrel; internals are not public API',
    suggestions: [
      {
        action: 'custom',
        target: folder,
        rationale: `Import the public entity through the barrel of '${folder}'`,
      },
    ],
    location: { file: edge.consumer, line: 1, column: 1 },
    typeOnly: edge.typeOnly,
  };
}

/** D7: bypassing a component-folder barrel is forbidden to external files. */
export const barrelIsPublicFace: Rule<BarrelIsPublicFaceOptions> = {
  id: 'barrel-is-public-face',
  pack: 'barrels',
  engine: 'syntactic',
  defaultSeverity: 'error',
  check: (graph, config, context): Diagnostic[] => {
    const folders = componentFolders(graph);
    const diagnostics: Diagnostic[] = [];
    for (const edge of graph.edges) {
      const verdict = evaluateEdge(edge, folders, config, context.options);
      if (verdict === null) continue;
      const folder = componentFolderOf(edge.producer, folders) ?? edge.producer;
      diagnostics.push(bypassDiagnostic(edge, verdict, folder, context));
    }
    return dedupByFingerprint(diagnostics);
  },
};
