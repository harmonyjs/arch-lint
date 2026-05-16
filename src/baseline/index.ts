/**
 * @fileoverview Public surface of the baseline subsystem — re-exports classify, snapshot,
 * prune, diff operations and file io for the runner (M7).
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
