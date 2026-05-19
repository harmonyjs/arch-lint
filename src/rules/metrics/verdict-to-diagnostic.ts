/**
 * @fileoverview Converts a MetricsVerdict into a Diagnostic — the projection
 * shared by all five metrics rules.
 */
import type {
  ActiveSeverity,
  Diagnostic,
  DiagnosticAnalysis,
  Suggestion,
} from '#foundation/types/index.js';

/** A measured threshold violation, before it becomes a Diagnostic. */
export interface MetricsVerdict {
  readonly ruleId: string;
  readonly entity: string;
  readonly fingerprint: string;
  readonly message: string;
  readonly expected: string;
  readonly actual: string;
  readonly reason: string;
  readonly suggestions: readonly Suggestion[];
  readonly analysis?: DiagnosticAnalysis;
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
    suggestions: verdict.suggestions,
    location: { file: verdict.entity, line: 1, column: 1 },
    ...(verdict.analysis !== undefined ? { analysis: verdict.analysis } : {}),
  };
}
