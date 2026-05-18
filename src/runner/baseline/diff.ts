/**
 * @fileoverview The read-only `baseline diff` operation: reports diagnostics not yet in the
 * baseline (added) and baseline records no longer reproduced (resolved).
 */

import type { Diagnostic } from '#types.js';
import { sortRecords } from './serialize.js';
import type { BaselineFile, BaselineRecord } from './types.js';

/** Result of diffing the current run against the baseline. */
export interface BaselineDiff {
  readonly added: readonly BaselineRecord[];
  readonly resolved: readonly BaselineRecord[];
}

/**
 * Compute the diff between current diagnostics and a baseline. `added` are violations
 * absent from the baseline; `resolved` are baseline records with no current diagnostic.
 */
export function diffBaseline(
  baseline: BaselineFile | null,
  diagnostics: readonly Diagnostic[],
): BaselineDiff {
  const records = baseline?.records ?? [];
  const baselineKeys = new Set(records.map(recordKey));
  const diagnosticKeys = new Set(diagnostics.map(diagnosticKey));
  const added = diagnostics.filter((d) => !baselineKeys.has(diagnosticKey(d))).map(toRecord);
  const resolved = records.filter((r) => !diagnosticKeys.has(recordKey(r)));
  return { added: sortRecords(dedupeRecords(added)), resolved: sortRecords(resolved) };
}

/** Convert a diagnostic to a minimal baseline record (no firstSeenAt — diff is read-only). */
function toRecord(diagnostic: Diagnostic): BaselineRecord {
  return diagnostic.fingerprint === undefined
    ? { ruleId: diagnostic.ruleId, entity: diagnostic.entity }
    : { ruleId: diagnostic.ruleId, entity: diagnostic.entity, fingerprint: diagnostic.fingerprint };
}

/** Drop duplicate records sharing a logical id. */
function dedupeRecords(records: readonly BaselineRecord[]): BaselineRecord[] {
  const byKey = new Map<string, BaselineRecord>();
  for (const record of records) byKey.set(recordKey(record), record);
  return [...byKey.values()];
}

/** Logical-id key of a baseline record. */
function recordKey(record: BaselineRecord): string {
  return `${record.ruleId} ${record.entity} ${record.fingerprint ?? ''}`;
}

/** Logical-id key of a diagnostic, identical shape to recordKey. */
function diagnosticKey(diagnostic: Diagnostic): string {
  return `${diagnostic.ruleId} ${diagnostic.entity} ${diagnostic.fingerprint ?? ''}`;
}
