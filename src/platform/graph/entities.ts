/**
 * @fileoverview Entity model — maps files to placement entities, distinguishes role
 * folders and component folders, and projects file edges onto the entity tree.
 */
import type { ConventionsConfig } from '#foundation/config/types.js';
import { baseNameOf, dirOf, firstSegment } from '#foundation/entity-id/index.js';
import type { SourceFileSet } from '#foundation/source-files/index.js';
import type { Edge } from './types.js';

export interface EntityContext {
  readonly sources: SourceFileSet;
  readonly conventions: ConventionsConfig;
}

/** True if `folderName` equals one of the `conventions.*Segment` role names. */
export function isRoleFolder(folderName: string, conventions: ConventionsConfig): boolean {
  return (
    folderName === conventions.privateSegment ||
    folderName === conventions.sharedSegment ||
    folderName === conventions.libSegment ||
    folderName === conventions.hooksSegment ||
    folderName === conventions.explicitClusterSegment ||
    folderName === conventions.modelSegment
  );
}

/** True if `folderId` is a component folder — a folder with a same-name entry file. */
export function isComponentFolder(folderId: string, ctx: EntityContext): boolean {
  const folderName = baseNameOf(folderId);
  return (
    ctx.sources.files.has(`${folderId}/${folderName}.ts`) ||
    ctx.sources.files.has(`${folderId}/${folderName}.tsx`)
  );
}

/**
 * Maps `fileId` to its placement entity (§4.3) — total over all files. A file inside
 * a component folder resolves to the nearest such folder; otherwise the file itself
 * is a standalone entity.
 */
export function entityOf(fileId: string, ctx: EntityContext): string {
  let folder = dirOf(fileId);
  while (folder.length > 0) {
    if (isComponentFolder(folder, ctx)) {
      return folder;
    }
    folder = dirOf(folder);
  }
  return fileId;
}

/**
 * Returns the nearest component-folder ancestor of `entityId`, skipping role folders
 * and plain folders (§7.1). When no such ancestor exists, falls back to the first
 * path segment as the layer root — layer roots are refined by the layers milestone.
 */
export function componentParent(entityId: string, ctx: EntityContext): string {
  const isFile = entityId.includes('.') && ctx.sources.files.has(entityId);
  let folder = isFile ? dirOf(entityId) : entityId;
  while (folder.includes('/')) {
    folder = dirOf(folder);
    if (folder.length === 0) {
      break;
    }
    if (isComponentFolder(folder, ctx)) {
      return folder;
    }
  }
  return firstSegment(entityId);
}

/**
 * Projects file-level edges onto the entity tree (§4.3): each edge `(consumerFile ->
 * producerFile)` becomes `(entityOf(consumer) -> entityOf(producer))`. Self-loops are
 * dropped, duplicate consumers collapsed, consumer arrays sorted by entity id (D8).
 */
export function projectEntityConsumers(
  edges: readonly Edge[],
  ctx: EntityContext,
): ReadonlyMap<string, readonly string[]> {
  const sets = new Map<string, Set<string>>();
  for (const edge of edges) {
    const producerEntity = entityOf(edge.producer, ctx);
    const consumerEntity = entityOf(edge.consumer, ctx);
    if (producerEntity === consumerEntity) {
      continue;
    }
    let bucket = sets.get(producerEntity);
    if (bucket === undefined) {
      bucket = new Set<string>();
      sets.set(producerEntity, bucket);
    }
    bucket.add(consumerEntity);
  }
  const result = new Map<string, readonly string[]>();
  for (const [producerEntity, consumers] of sets) {
    result.set(producerEntity, [...consumers].sort());
  }
  return result;
}
