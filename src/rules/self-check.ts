/**
 * @fileoverview runtimeSelfCheck — detects duplicate logical violation IDs (§10.2).
 */

import { EngineError } from '../errors.js';
import type { Diagnostic } from '../types.js';

/** Logical violation ID — (ruleId, entity, fingerprint) joined by a space separator. */
function logicalId(diagnostic: Diagnostic): string {
  return `${diagnostic.ruleId} ${diagnostic.entity} ${diagnostic.fingerprint ?? ''}`;
}

/** Throw EngineError when two diagnostics share a (ruleId, entity, fingerprint) (§10.2). */
export function runtimeSelfCheck(diagnostics: readonly Diagnostic[]): void {
  const seen = new Set<string>();
  for (const diagnostic of diagnostics) {
    const id = logicalId(diagnostic);
    if (seen.has(id)) {
      throw new EngineError(
        `runtime self-check failed: duplicate violation id for rule "${diagnostic.ruleId}" ` +
          `on entity "${diagnostic.entity}" — a rule emitted a missing or non-unique fingerprint`,
      );
    }
    seen.add(id);
  }
}
