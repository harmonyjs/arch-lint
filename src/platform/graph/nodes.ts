/**
 * @fileoverview Builds graph nodes — one per source file plus one per component
 * folder — with entity classification and explicit-placement clustering.
 */

import picomatch from 'picomatch';
import { type SourceFile, Node as TsNode } from 'ts-morph';
import type {
  ConventionsConfig,
  ExplicitPlacementRule,
  ViewConfig,
} from '#foundation/config/types.js';
import { baseNameOf, dirOf, dropExtension } from '#foundation/entity-id/index.js';
import type { SourceFileSet } from '#foundation/source-files/index.js';
import { type EntityContext, isComponentFolder } from './entities.js';
import { classifyRegion, classifyRegionFromPrefixes, hasJsx } from './region.js';
import type { Node } from './types.js';

/** True if a source file consists solely of re-export declarations (a pure barrel). */
export function isBarrelFile(sourceFile: SourceFile): boolean {
  const statements = sourceFile.getStatements();
  if (statements.length === 0) {
    return false;
  }
  return statements.every(
    (s) => TsNode.isExportDeclaration(s) && s.getModuleSpecifier() !== undefined,
  );
}

/** True if `fileId` is the same-name entry file of its enclosing folder. */
function isEntryFile(fileId: string): boolean {
  const folder = dirOf(fileId);
  if (folder === '') return false;
  const folderName = baseNameOf(folder);
  return dropExtension(baseNameOf(fileId)) === folderName;
}

type Placement = { placementMode: Node['placementMode']; cluster?: string };

/** Determines placementMode/cluster for a node id from explicitPlacement rules. */
function placementOf(id: string, rules: readonly ExplicitPlacementRule[]): Placement {
  for (const rule of rules) {
    if (picomatch.isMatch(id, rule.path)) {
      return { placementMode: 'explicit', cluster: rule.cluster };
    }
  }
  return { placementMode: 'reactive' };
}

/** Records every component-folder ancestor of `fileId` into `componentFolders`. */
function collectComponentFolders(
  fileId: string,
  entityCtx: EntityContext,
  componentFolders: Set<string>,
): void {
  let folder = dirOf(fileId);
  while (folder.length > 0 && folder.includes('/')) {
    if (isComponentFolder(folder, entityCtx)) {
      componentFolders.add(folder);
    }
    folder = dirOf(folder);
  }
}

/**
 * Computes the set of node ids inside the view region (#26). In 'auto' mode
 * the roots come from JSX-bearing `.tsx` files; an explicit prefix list skips
 * JSX detection entirely. `allIds` must include both file and folder ids so a
 * component folder inside the region is classified too.
 */
function viewRegionIds(
  set: SourceFileSet,
  view: ViewConfig,
  allIds: readonly string[],
): ReadonlySet<string> {
  if (view.region !== 'auto') {
    return classifyRegionFromPrefixes(view.region, allIds);
  }
  const jsxBearing: string[] = [];
  for (const [fileId, sourceFile] of set.files) {
    if (fileId.endsWith('.tsx') && hasJsx(sourceFile)) {
      jsxBearing.push(fileId);
    }
  }
  return classifyRegion(jsxBearing, allIds);
}

/** Builds the node map: file nodes plus folder nodes for component folders (§4.1). */
export function buildNodes(
  set: SourceFileSet,
  conventions: ConventionsConfig,
  explicitPlacement: readonly ExplicitPlacementRule[],
  view: ViewConfig,
): ReadonlyMap<string, Node> {
  const entityCtx: EntityContext = { sources: set, conventions };
  const nodes = new Map<string, Node>();
  const componentFolders = new Set<string>();

  for (const [fileId, sourceFile] of set.files) {
    const barrel = isBarrelFile(sourceFile);
    const entry = isEntryFile(fileId);
    nodes.set(fileId, {
      id: fileId,
      kind: 'file',
      isEntity: !barrel && !entry,
      ...placementOf(fileId, explicitPlacement),
    });
    collectComponentFolders(fileId, entityCtx, componentFolders);
  }

  for (const folderId of componentFolders) {
    nodes.set(folderId, {
      id: folderId,
      kind: 'folder',
      isEntity: true,
      ...placementOf(folderId, explicitPlacement),
    });
  }

  const region = viewRegionIds(set, view, [...nodes.keys()]);
  for (const [id, node] of nodes) {
    if (region.has(id)) {
      nodes.set(id, { ...node, region: 'view' });
    }
  }
  return nodes;
}
