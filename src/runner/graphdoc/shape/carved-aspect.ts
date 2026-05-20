/**
 * @fileoverview Detects pairs of files `X.ts` + `X-{aspect}.ts` in the same
 * folder connected by a runtime edge. Surfaces a carved-out aspect that
 * factored out of its host module.
 */
import { baseNameOf, dropExtension } from '#foundation/entity-id/index.js';
import type { ConsumerGraph } from '#platform/graph/types.js';
import type { FolderTree } from '#runner/graphdoc/model/tree.js';
import type { CarvedAspectFinding, DetectorInput } from './types.js';

/** Walks the folder tree and emits carved-aspect findings. */
export function findCarvedAspect(input: DetectorInput): CarvedAspectFinding[] {
  const out: CarvedAspectFinding[] = [];
  walk(input.tree, input.graph, input.locByPath, out);
  return out;
}

/** Visits every folder, scanning its direct files for carved-aspect pairs. */
function walk(
  folder: FolderTree,
  graph: ConsumerGraph,
  locByPath: ReadonlyMap<string, number>,
  out: CarvedAspectFinding[],
): void {
  inspectFolder(folder, graph, locByPath, out);
  for (const child of folder.folders.values()) walk(child, graph, locByPath, out);
}

/** Inspects one folder's direct files for `X.ts` + `X-{aspect}.ts` pairs. */
function inspectFolder(
  folder: FolderTree,
  graph: ConsumerGraph,
  locByPath: ReadonlyMap<string, number>,
  out: CarvedAspectFinding[],
): void {
  const fileByBase = new Map<string, string>();
  for (const path of folder.files) {
    const base = baseName(path);
    if (base !== null) fileByBase.set(base, path);
  }
  for (const [base, corePath] of fileByBase) {
    for (const [otherBase, otherPath] of fileByBase) {
      if (!otherBase.startsWith(`${base}-`)) continue;
      const direction = edgeDirection(graph, corePath, otherPath);
      if (direction === null) continue;
      out.push({
        kind: 'carved-aspect',
        core: corePath,
        aspect: otherPath,
        coreLoc: locByPath.get(corePath) ?? 0,
        aspectLoc: locByPath.get(otherPath) ?? 0,
        direction,
      });
    }
  }
}

/** Returns the file's basename without extension, or null for non-.ts(x) files. */
function baseName(path: string): string | null {
  const file = baseNameOf(path);
  if (!/\.tsx?$/.test(file)) return null;
  return dropExtension(file);
}

/** Edge direction between two files, or null when no runtime edge connects them. */
function edgeDirection(
  graph: ConsumerGraph,
  core: string,
  aspect: string,
): CarvedAspectFinding['direction'] | null {
  for (const edge of graph.producersOf.get(core) ?? []) {
    if (!edge.typeOnly && edge.producer === aspect) return 'core→aspect';
  }
  for (const edge of graph.producersOf.get(aspect) ?? []) {
    if (!edge.typeOnly && edge.producer === core) return 'aspect→core';
  }
  return null;
}
