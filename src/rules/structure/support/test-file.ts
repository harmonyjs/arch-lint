/**
 * @fileoverview The structure pack's test-file predicate. Not path arithmetic —
 * a structure-pack-local convention check, so it stays in the structure pack
 * rather than moving into `src/entity-id/`.
 */

/** True when a file name matches the test-file pattern `*.test.*`. */
export function isTestFile(baseName: string): boolean {
  return baseName.includes('.test.');
}
