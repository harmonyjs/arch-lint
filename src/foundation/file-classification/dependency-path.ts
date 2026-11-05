/**
 * @fileoverview The dependency-path predicate — classifies a path as living in
 * an installed dependency folder. Discovery, the watcher and module resolution
 * share it, so no traversal of the project ever walks into installed packages.
 */

/** The folder name that holds installed packages. */
export const DEPENDENCY_DIR = 'node_modules';

/** True when any segment of `path` (POSIX or Windows separators) is a dependency folder. */
export function isDependencyPath(path: string): boolean {
  return path.split(/[\\/]/).includes(DEPENDENCY_DIR);
}
