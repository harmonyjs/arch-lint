/**
 * @fileoverview Folder-tree construction for buildGraphDoc — derives the folder
 * hierarchy implied by the graph's file ids, computes subtree sizes, and decides
 * which folders own their own drill-down section.
 */
import type { ConsumerGraph } from '../graph/types.js';

/** A folder gets its own section once its file count exceeds this threshold. */
export const THRESHOLD = 18;

/** A folder of the tree implied by the graph's file ids. */
export interface FolderTree {
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
export function buildFolderTree(graph: ConsumerGraph, root: string): FolderTree {
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
export function slugOf(folderPath: string, root: string): string {
  if (folderPath === root) return 'overview';
  return folderPath.slice(root.length + 1).replace(/\//g, '-');
}

/** Heading title of a folder: `root` → "Overview", else slash-separated. */
export function titleOf(folderPath: string, root: string): string {
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
export function sectionFolders(tree: FolderTree, root: string): FolderTree[] {
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
