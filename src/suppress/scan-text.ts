/**
 * @fileoverview Lexical scanner for @arch-decision comment text — recognizes the three
 * §9 forms (broad, rule-scoped, with `until` expiry) and yields a structured raw result.
 */
import type { Location } from '../types.js';
import type { RawSuppressComment } from './types.js';

/**
 * Scan one comment's plain text for an @arch-decision directive.
 * Returns `null` if the marker is absent; otherwise a raw, not-yet-validated result.
 */
export function scanSuppressText(
  text: string,
  marker: string,
  location: Location,
): RawSuppressComment | null {
  const markerIdx = text.indexOf(marker);
  if (markerIdx === -1) return null;
  const rest = text.slice(markerIdx + marker.length);
  const ruleId = extractRuleId(rest);
  const afterBracket = stripRuleIdBracket(rest);
  const body = afterBracket.replace(/^\s*:\s*/, '').trim();
  const { expiryText, reasonText } = splitExpiry(body);
  return { ruleId, reasonText, expiryText, location };
}

/** Extract `<ruleId>` from a leading `[<ruleId>]`; '' for empty `[]`; null when absent. */
function extractRuleId(rest: string): string | null {
  const m = /^\s*\[([^\]]*)\]/.exec(rest);
  if (m === null) return null;
  return m[1] ?? '';
}

/** Drop a leading `[...]` bracket so the remainder starts at the `:` separator. */
function stripRuleIdBracket(rest: string): string {
  return rest.replace(/^\s*\[[^\]]*\]/, '');
}

/** Split a "until <date>, <reason>" body into its expiry and reason parts. */
function splitExpiry(body: string): { expiryText: string | null; reasonText: string } {
  const m = /^until\s+(\S+?)\s*,\s*([\s\S]*)$/.exec(body);
  if (m === null) {
    const noReason = /^until\s+(\S+)\s*,?\s*$/.exec(body);
    if (noReason !== null) return { expiryText: noReason[1] ?? null, reasonText: '' };
    return { expiryText: null, reasonText: body };
  }
  return { expiryText: m[1] ?? null, reasonText: (m[2] ?? '').trim() };
}
