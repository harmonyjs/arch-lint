/**
 * @fileoverview Converts a PlacementVerdict into a Diagnostic shared by the four placement rules.
 */
import type { ActiveSeverity, Diagnostic } from '../../types.js';
import type { PlacementVerdict } from './analyze.js';

/** Build a Diagnostic from a placement verdict at the given severity. */
export function verdictToDiagnostic(
  verdict: PlacementVerdict,
  severity: ActiveSeverity,
): Diagnostic {
  return {
    ruleId: verdict.ruleId,
    severity,
    entity: verdict.entity,
    message: `${verdict.entity} is misplaced — expected ${verdict.expected}`,
    expected: verdict.expected,
    actual: verdict.actual,
    reason: verdict.reason,
    suggestions: [
      {
        action: 'move',
        target: verdict.expected,
        rationale: 'relocate the entity to its expected placement',
      },
    ],
    location: { file: verdict.entity, line: 1, column: 1 },
  };
}
