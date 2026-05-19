/**
 * @fileoverview The test-file predicate — classifies a file basename as a test
 * file. A filename-level convention check shared by the structure rules and by
 * source-file discovery, which excludes test files from the import graph.
 */

/**
 * True when a file name matches the test-file pattern `*.test.*`. The `.test.`
 * infix must be preceded by a non-empty name segment, so a bare `.test.ts`
 * dotfile is not classified as a test file.
 */
export function isTestFile(baseName: string): boolean {
  return baseName.indexOf('.test.') > 0;
}
