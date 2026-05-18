/**
 * @fileoverview Semantic interpreter turning a raw scanned @arch-decision into either a
 * valid ParsedSuppress or a typed MalformedSuppress, enforcing the §9 validity rules.
 */
import type { SuppressConfig } from '#foundation/config/types.js';
import type { MalformedSuppress, ParsedSuppress, RawSuppressComment } from './types.js';

/** Tagged outcome of interpreting one raw @arch-decision comment. */
export type InterpretResult =
  | { readonly ok: true; readonly value: ParsedSuppress }
  | { readonly ok: false; readonly value: MalformedSuppress };

/**
 * Validate a raw scanned comment against §9 rules: rule-id non-empty if bracketed,
 * reason present and long enough, expiry a valid ISO date.
 */
export function interpretSuppress(
  raw: RawSuppressComment,
  config: SuppressConfig,
): InterpretResult {
  const ruleId = raw.ruleId === null ? null : raw.ruleId.trim();
  const baseLoc = raw.location;
  if (ruleId === '') {
    return malformed('empty-rule-id', null, undefined, baseLoc);
  }
  const reason = raw.reasonText.trim();
  if (reason.length === 0) {
    return malformed('missing-reason', ruleId, undefined, baseLoc);
  }
  if (reason.length < config.minReasonLength) {
    return malformed('short-reason', ruleId, reason, baseLoc);
  }
  const expiry = resolveExpiry(raw.expiryText, config);
  if (expiry === 'invalid') {
    return malformed('bad-expiry', ruleId, reason, baseLoc);
  }
  return { ok: true, value: { ruleId, reason, expiry, location: baseLoc } };
}

/** Build a failed InterpretResult carrying a typed MalformedSuppress. */
function malformed(
  kind: MalformedSuppress['kind'],
  ruleId: string | null,
  reason: string | undefined,
  location: MalformedSuppress['location'],
): InterpretResult {
  return { ok: false, value: { kind, ruleId, reason, location } };
}

/** Resolve raw expiry text into a Date, `null` (none/disabled), or `'invalid'`. */
function resolveExpiry(expiryText: string | null, config: SuppressConfig): Date | null | 'invalid' {
  if (expiryText === null) return null;
  if (!config.expirySupport) return null;
  if (!/^\d{4}-\d{2}-\d{2}(T[\d:.]+Z?)?$/.test(expiryText)) return 'invalid';
  const parsed = new Date(expiryText);
  return Number.isNaN(parsed.getTime()) ? 'invalid' : parsed;
}
