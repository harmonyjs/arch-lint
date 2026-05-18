/**
 * @fileoverview Public surface of the baseline subsystem — a standalone
 * library of baseline-file operations: classify, snapshot, prune and diff,
 * plus baseline-file load/parse/serialize/write io.
 */
export { classifyDiagnostics } from './classify.js';
export type { BaselineDiff } from './diff.js';
export { diffBaseline } from './diff.js';
export { pruneBaseline } from './prune.js';
export {
  baselineFileSchema,
  loadBaseline,
  parseBaselineFile,
  serializeBaseline,
  sortRecords,
  writeBaseline,
} from './serialize.js';
export { snapshotBaseline } from './snapshot.js';
