/**
 * @fileoverview Builds graph nodes — one per source file plus one per component
 * folder — with entity classification and explicit-placement clustering.
 */

import picomatch from 'picomatch';
import { type SourceFile, Node as TsNode } from 'ts-morph';
import type { ConventionsConfig, ExplicitPlacementRule } from '../config/types.js';
import type { Node } from './types.js';
import { type EntityContext, isComponentFolder } from './entities.js';
import type { SourceFileSet } from './source-files.js';

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
  const lastSlash = fileId.lastIndexOf('/');
  if (lastSlash < 0) {
    return false;
  }
  const folder = fileId.slice(0, lastSlash);
  const folderName = folder.slice(folder.lastIndexOf('/') + 1);
  const base = fileId.slice(lastSlash + 1).replace(/\.(tsx|ts)$/, '');
  return base === folderName;
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
  let folder = fileId.slice(0, fileId.lastIndexOf('/'));
  while (folder.length > 0 && folder.includes('/')) {
    if (isComponentFolder(folder, entityCtx)) {
      componentFolders.add(folder);
    }
    folder = folder.slice(0, folder.lastIndexOf('/'));
  }
}

/** Builds the node map: file nodes plus folder nodes for component folders (§4.1). */
export function buildNodes(
  set: SourceFileSet,
  conventions: ConventionsConfig,
  explicitPlacement: readonly ExplicitPlacementRule[],
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
  return nodes;
}
