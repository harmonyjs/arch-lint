/**
 * @fileoverview The `baseline init` operation: snapshots every current violation into a
 * fresh BaselineFile with deduplicated, alphabetically sorted records.
 */
import type { BaselineFile, BaselineRecord, Diagnostic } from '../types.js';
import { sortRecords } from './serialize.js';

/**
 * Build a baseline file capturing all current diagnostics. Duplicate logical ids are
 * collapsed; records are sorted, making repeated snapshots of the same input identical.
 */
export function snapshotBaseline(
  diagnostics: readonly Diagnostic[],
  generatorVersion: string,
  generatedAt: string = new Date().toISOString(),
): BaselineFile {
  const byKey = new Map<string, BaselineRecord>();
  for (const diagnostic of diagnostics) {
    const record = toRecord(diagnostic, generatedAt);
    byKey.set(recordKey(record), record);
  }
  return {
    schemaVersion: 1,
    generatedAt,
    generatorVersion,
    records: sortRecords([...byKey.values()]),
  };
}

/** Convert a diagnostic into a baseline record stamped with firstSeenAt. */
function toRecord(diagnostic: Diagnostic, firstSeenAt: string): BaselineRecord {
  const base = { ruleId: diagnostic.ruleId, entity: diagnostic.entity, firstSeenAt };
  return diagnostic.fingerprint === undefined
    ? base
    : { ...base, fingerprint: diagnostic.fingerprint };
}

/** Logical-id key: ruleId | entity | fingerprint. */
function recordKey(record: BaselineRecord): string {
  return `${record.ruleId} ${record.entity} ${record.fingerprint ?? ''}`;
}
