/**
 * @fileoverview dedupPlacement — defensive engine step keeping one placement verdict per entity.
 */
import type { Diagnostic } from '../types.js';

/** §7.3 projection priority — lower index wins a per-entity collision. */
const PLACEMENT_PRIORITY: readonly string[] = [
  'slots-privacy',
  'empty-items-folder',
  'siblings-forbidden',
  'lca-placement',
];

/** Priority rank of a placement ruleId; -1 for non-placement rules. */
function placementRank(ruleId: string): number {
  return PLACEMENT_PRIORITY.indexOf(ruleId);
}

/** Keep one placement diagnostic per entity (§7.3 winner); pass others through (§8.4, D3). */
export function dedupPlacement(diagnostics: readonly Diagnostic[]): readonly Diagnostic[] {
  const winners = new Map<string, Diagnostic>();
  const passthrough: Diagnostic[] = [];
  for (const diagnostic of diagnostics) {
    const rank = placementRank(diagnostic.ruleId);
    if (rank === -1) {
      passthrough.push(diagnostic);
      continue;
    }
    const current = winners.get(diagnostic.entity);
    if (current === undefined || rank < placementRank(current.ruleId)) {
      winners.set(diagnostic.entity, diagnostic);
    }
  }
  return [...passthrough, ...winners.values()];
}
