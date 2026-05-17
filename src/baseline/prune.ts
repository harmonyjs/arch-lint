/**
 * @fileoverview The `baseline prune` operation: drops baseline records that no longer have
 * a matching diagnostic (resolved), preserving the metadata of records that survive.
 */

import type { Diagnostic } from '../types.js';
import { sortRecords } from './serialize.js';
import type { BaselineFile, BaselineRecord } from './types.js';

/**
 * Remove baseline records with no matching diagnostic in the current run. Surviving
 * records keep their firstSeenAt/note untouched; new diagnostics are never added (§10.3).
 */
export function pruneBaseline(
  baseline: BaselineFile,
  diagnostics: readonly Diagnostic[],
  generatorVersion: string,
  generatedAt: string = new Date().toISOString(),
): BaselineFile {
  const present = new Set(diagnostics.map(diagnosticKey));
  const survivors = baseline.records.filter((r) => present.has(recordKey(r)));
  return {
    schemaVersion: 1,
    generatedAt,
    generatorVersion,
    records: sortRecords(survivors),
  };
}

/** Logical-id key of a baseline record. */
function recordKey(record: BaselineRecord): string {
  return `${record.ruleId} ${record.entity} ${record.fingerprint ?? ''}`;
}

/** Logical-id key of a diagnostic, identical shape to recordKey. */
function diagnosticKey(diagnostic: Diagnostic): string {
  return `${diagnostic.ruleId} ${diagnostic.entity} ${diagnostic.fingerprint ?? ''}`;
}
