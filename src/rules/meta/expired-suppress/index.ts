/**
 * @fileoverview expired-suppress rule — reports expired or malformed @arch-decision comments.
 */
import type { Rule } from '../../types.js';
import type { Diagnostic, ParsedSuppress } from '../../../types.js';
/** Deterministic djb2 hash of a string, rendered as a hex digest. */
function hashReason(reason: string): string {
  let hash = 5381;
  for (let i = 0; i < reason.length; i += 1) {
    hash = ((hash << 5) + hash + reason.charCodeAt(i)) | 0;
  }
  return (hash >>> 0).toString(16);
}

/** Build one diagnostic from an expired/malformed parsed suppress. */
function toDiagnostic(suppress: ParsedSuppress, severity: Diagnostic['severity']): Diagnostic {
  const target = suppress.ruleId ?? '*';
  return {
    ruleId: 'expired-suppress',
    severity,
    entity: suppress.location.file,
    fingerprint: `${target}#${hashReason(suppress.reason)}`,
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
export const expiredSuppressRule: Rule = {
  id: 'expired-suppress',
  pack: 'meta',
  engine: 'meta',
  defaultSeverity: 'warning',
  check: (_graph, _config, context): Diagnostic[] => {
    const out: Diagnostic[] = [];
    const seen = new Set<string>();
    for (const suppress of context.suppress.findExpired()) {
      const diagnostic = toDiagnostic(suppress, context.severity);
      if (seen.has(diagnostic.fingerprint!)) continue;
      seen.add(diagnostic.fingerprint!);
      out.push(diagnostic);
    }
    return out;
  },
};
