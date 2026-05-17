/**
 * @fileoverview Baseline type vocabulary — the on-disk baseline file schema and
 * its records. The baseline subsystem owns these; the rule engine reads BaselineFile
 * to classify diagnostics as new vs already-accepted.
 */

export interface BaselineRecord {
  readonly ruleId: string;
  readonly entity: string;
  readonly fingerprint?: string;
  readonly firstSeenAt?: string;
  readonly note?: string;
}

export interface BaselineFile {
  readonly schemaVersion: 1;
  readonly generatedAt: string;
  readonly generatorVersion: string;
  readonly records: readonly BaselineRecord[];
}
