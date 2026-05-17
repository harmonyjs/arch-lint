/**
 * @fileoverview expired-suppress rule — reports expired or malformed @arch-decision comments.
 */

import type { ParsedSuppress } from '../../../suppress/types.js';
import type { Diagnostic } from '../../../types.js';
import type { GraphRule } from '../../types.js';

/** Deterministic djb2 hash of a string, rendered as a hex digest. */
function hashReason(reason: string): string {
  let hash = 5381;
  for (let i = 0; i < reason.length; i += 1) {
    hash = ((hash << 5) + hash + reason.charCodeAt(i)) | 0;
  }
  return (hash >>> 0).toString(16);
}

/** Stable fingerprint of an expired/malformed parsed suppress. */
function fingerprintOf(suppress: ParsedSuppress): string {
  const target = suppress.ruleId ?? '*';
  return `${target}#${hashReason(suppress.reason)}`;
}

/** Build one diagnostic from an expired/malformed parsed suppress. */
function toDiagnostic(suppress: ParsedSuppress, severity: Diagnostic['severity']): Diagnostic {
  const target = suppress.ruleId ?? '*';
  return {
    ruleId: 'expired-suppress',
    severity,
    entity: suppress.location.file,
    fingerprint: fingerprintOf(suppress),
    message: `expired or malformed @arch-decision suppress for ${target}`,
    actual: suppress.location.file,
    reason: suppress.reason,
    suggestions: [
      { action: 'remove-suppress', rationale: 'remove or renew the stale @arch-decision comment' },
    ],
    location: suppress.location,
  };
}

/** Rule: surface @arch-decision comments that are expired or malformed (§9). */
export const expiredSuppressRule: GraphRule = {
  id: 'expired-suppress',
  pack: 'meta',
  engine: 'graph',
  defaultSeverity: 'warning',
  check: (_graph, _config, context): Diagnostic[] => {
    const out: Diagnostic[] = [];
    const seen = new Set<string>();
    for (const suppress of context.suppress.findExpired()) {
      const fingerprint = fingerprintOf(suppress);
      if (seen.has(fingerprint)) continue;
      seen.add(fingerprint);
      out.push(toDiagnostic(suppress, context.severity));
    }
    return out;
  },
};
