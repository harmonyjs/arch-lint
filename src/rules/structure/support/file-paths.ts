/**
 * @fileoverview Path helpers shared by the structure pack — directory, base name,
 * extension-stripped stem, and the test-file predicate, all over POSIX graph file ids.
 */

/** POSIX directory portion of a file id; '' when the id has no directory. */
export function dirOf(id: string): string {
  const slash = id.lastIndexOf('/');
  return slash === -1 ? '' : id.slice(0, slash);
}

/** Final path segment of a file id — the file name with all its extensions. */
export function baseNameOf(id: string): string {
  const slash = id.lastIndexOf('/');
  return slash === -1 ? id : id.slice(slash + 1);
}

/** The file name with every extension stripped — the text before the first dot. */
export function stemOf(baseName: string): string {
  const dot = baseName.indexOf('.');
  return dot === -1 ? baseName : baseName.slice(0, dot);
}

/** True when a file name matches the test-file pattern `*.test.*`. */
export function isTestFile(baseName: string): boolean {
  return baseName.includes('.test.');
}
