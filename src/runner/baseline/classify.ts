/**
 * @fileoverview Pure baseline classifier (D2): assigns each diagnostic a `new` or
 * `inBaseline` status by matching its (ruleId, entity, fingerprint?) logical id.
 */

import type { Diagnostic } from '#foundation/types/index.js';
import type { BaselineFile, BaselineRecord } from './types.js';
/**
 * Classify diagnostics against a baseline. A `null` baseline yields all-new (D2);
 * otherwise each diagnostic matching a record by logical id becomes `inBaseline`.
 */
export function classifyDiagnostics(
  diagnostics: readonly Diagnostic[],
  baseline: BaselineFile | null,
): Diagnostic[] {
  if (baseline === null) {
    return diagnostics.map((d) => ({ ...d, status: 'new' as const }));
  }
  const keys = new Set(baseline.records.map(recordKey));
  return diagnostics.map((d) => ({
    ...d,
    status: keys.has(diagnosticKey(d)) ? ('inBaseline' as const) : ('new' as const),
  }));
}

/** Logical-id key of a baseline record: ruleId | entity | fingerprint. */
function recordKey(record: BaselineRecord): string {
  return `${record.ruleId} ${record.entity} ${record.fingerprint ?? ''}`;
}

/** Logical-id key of a diagnostic, identical shape to recordKey. */
function diagnosticKey(diagnostic: Diagnostic): string {
  return `${diagnostic.ruleId} ${diagnostic.entity} ${diagnostic.fingerprint ?? ''}`;
}
