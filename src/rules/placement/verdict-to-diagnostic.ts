/**
 * @fileoverview Converts a PlacementVerdict into a Diagnostic shared by the four placement rules.
 */
import type { ActiveSeverity, Diagnostic } from '../../types.js';
import type { PlacementVerdict } from './analyze.js';

/**
 * Message text for a verdict. `lca-placement`'s `expected` is the LCA directory,
 * so it reads as a locality violation; role-folder verdicts name the slot path
 * the entity should move to.
 */
function messageFor(verdict: PlacementVerdict): string {
  if (verdict.ruleId === 'lca-placement') {
    return `${verdict.entity} is consumed from within ${verdict.expected} but placed outside it`;
  }
  return `${verdict.entity} is misplaced — expected ${verdict.expected}`;
}

/** Rationale text for the move suggestion — locality versus role-folder framing. */
function rationaleFor(verdict: PlacementVerdict): string {
  return verdict.ruleId === 'lca-placement'
    ? 'relocate the entity inside its LCA subtree'
    : 'relocate the entity to its expected placement';
}

/** Build a Diagnostic from a placement verdict at the given severity. */
export function verdictToDiagnostic(
  verdict: PlacementVerdict,
  severity: ActiveSeverity,
): Diagnostic {
  return {
    ruleId: verdict.ruleId,
    severity,
    entity: verdict.entity,
    message: messageFor(verdict),
    expected: verdict.expected,
    actual: verdict.actual,
    reason: verdict.reason,
    suggestions: [
      {
        action: 'move',
        target: verdict.expected,
        rationale: rationaleFor(verdict),
      },
    ],
    location: { file: verdict.entity, line: 1, column: 1 },
  };
}
