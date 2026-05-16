/**
 * @fileoverview Graph-node classification — barrel files, component-folder entries,
 * role folders — backing the structural decisions of the barrels and view packs (§4.1).
 */
import type { ConventionsConfig } from '../../types.js';
import { segmentsOf } from './segments.js';

/** True when the file is a barrel — its basename is one of conventions.indexFiles. */
export function isBarrelFile(fileId: string, conventions: ConventionsConfig): boolean {
  const base = fileId.slice(fileId.lastIndexOf('/') + 1);
  return conventions.indexFiles.includes(base);
}

/**
 * True when the file is the same-name entry of its folder (`X/X.ts`, `X/X.tsx`):
 * the basename without extension equals the parent segment, and it is not a barrel.
 */
export function isComponentFolderEntry(fileId: string): boolean {
  const segs = segmentsOf(fileId);
  if (segs.length < 2) return false;
  const base = segs[segs.length - 1]!;
  const parent = segs[segs.length - 2]!;
  return base === parent && base !== 'index';
}

/**
 * The nearest component folder enclosing a file: the longest known folder id that
 * is a per-segment prefix of the file path; null when the file is in no folder.
 */
export function componentFolderOf(
  fileId: string,
  componentFolders: ReadonlySet<string>,
): string | null {
  const segs = segmentsOf(fileId);
  for (let len = segs.length - 1; len >= 1; len--) {
    const candidate = segs.slice(0, len).join('/');
    if (componentFolders.has(candidate)) return candidate;
  }
  return null;
}

/** The role segment of a folder (a conventions.*Segment value), or null. */
export function roleFolderSegment(folderId: string, conventions: ConventionsConfig): string | null {
  const segs = segmentsOf(folderId);
  const last = segs[segs.length - 1];
  const roles = [
    conventions.privateSegment,
    conventions.sharedSegment,
    conventions.libSegment,
    conventions.hooksSegment,
    conventions.explicitClusterSegment,
    conventions.modelSegment,
  ];
  return last !== undefined && roles.includes(last) ? last : null;
}
