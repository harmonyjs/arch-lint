/**
 * @fileoverview Canonical arithmetic over entity ids — POSIX repo-relative file
 * paths such as `src/graph/types.ts`. The single implementation of every
 * directory/basename/segment/ancestor operation, shared by graph, graphdoc and
 * the rules packs. A dependency-free leaf module, peer of `src/types.ts`.
 */

/** POSIX directory portion of an id; `''` when the id has no directory. */
export function dirOf(id: string): string {
  const slash = id.lastIndexOf('/');
  return slash === -1 ? '' : id.slice(0, slash);
}

/** Final path segment of an id — the file name with all its extensions. */
export function baseNameOf(id: string): string {
  const slash = id.lastIndexOf('/');
  return slash === -1 ? id : id.slice(slash + 1);
}
