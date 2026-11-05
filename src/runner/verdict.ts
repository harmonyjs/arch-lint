/**
 * @fileoverview The one blocking predicate every verdict exit code is derived from.
 */
import type { Diagnostic } from '#foundation/types/index.js';

/** `info` never blocks; an unclassified diagnostic counts as new, as in the summary. */
export function isBlocking(d: Diagnostic): boolean {
  return d.severity !== 'info' && d.status !== 'inBaseline';
}

export function verdictExitCode(diagnostics: readonly Diagnostic[]): 0 | 1 {
  return diagnostics.some(isBlocking) ? 1 : 0;
}
