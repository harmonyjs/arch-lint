/**
 * @fileoverview Specificity-precedence resolution for a suppress stack (§9): rule-specific
 * comments override broad ones; within a scope the most generous `until` expiry wins.
 */
import type { ParsedSuppress } from './types.js';
/**
 * Decide whether the given suppress stack suppresses `ruleId` at instant `now`,
 * applying §9 specificity precedence and most-generous-expiry rules.
 */
export function isSuppressedByStack(
  stack: readonly ParsedSuppress[],
  ruleId: string,
  now: Date,
): boolean {
  const ruleSpecific = stack.filter((s) => s.ruleId === ruleId);
  const scope = ruleSpecific.length > 0 ? ruleSpecific : stack.filter((s) => s.ruleId === null);
  if (scope.length === 0) return false;
  return scopeIsActive(scope, now);
}

/** True if the most generous expiry in the scope has not yet passed. */
function scopeIsActive(scope: readonly ParsedSuppress[], now: Date): boolean {
  if (scope.some((s) => s.expiry === null)) return true;
  const latest = Math.max(...scope.map((s) => (s.expiry as Date).getTime()));
  return latest >= now.getTime();
}
