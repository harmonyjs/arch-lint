/**
 * @fileoverview Converts a MetricsVerdict into a Diagnostic — the projection
 * shared by all five metrics rules.
 */
import type { ActiveSeverity, Diagnostic } from '#types.js';

/** A measured threshold violation, before it becomes a Diagnostic. */
export interface MetricsVerdict {
  readonly ruleId: string;
  readonly entity: string;
  readonly fingerprint: string;
  readonly message: string;
  readonly expected: string;
  readonly actual: string;
  readonly reason: string;
  readonly suggestion: string;
}

/** Build a Diagnostic from a metrics verdict at the given severity. */
export function verdictToDiagnostic(verdict: MetricsVerdict, severity: ActiveSeverity): Diagnostic {
  return {
    ruleId: verdict.ruleId,
    severity,
    entity: verdict.entity,
    fingerprint: verdict.fingerprint,
    message: verdict.message,
    expected: verdict.expected,
    actual: verdict.actual,
    reason: verdict.reason,
    suggestions: [{ action: 'custom', rationale: verdict.suggestion }],
    location: { file: verdict.entity, line: 1, column: 1 },
  };
}
