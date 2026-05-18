/**
 * @fileoverview The structure pack's test-file predicate. Not path arithmetic —
 * a structure-pack-local convention check, so it stays in the structure pack
 * rather than moving into `src/entity-id/`.
 */

/**
 * True when a file name matches the test-file pattern `*.test.*`. The `.test.`
 * infix must be preceded by a non-empty name segment, so a bare `.test.ts`
 * dotfile is not classified as a test file.
 */
export function isTestFile(baseName: string): boolean {
  return baseName.indexOf('.test.') > 0;
}
