/**
 * @fileoverview makeThinPlacementRule — builds a placement Rule that projects
 * one analyzePlacement verdict kind into Diagnostics (D3, §7.3).
 */

import type { ActiveSeverity, Diagnostic } from '#foundation/types/index.js';
import type { GraphRule } from '#platform/engine/types.js';
import { analyzePlacement, type PlacementVerdict } from './analyze.js';
import { verdictToDiagnostic } from './verdict-to-diagnostic.js';

/**
 * Builds a placement Rule that calls analyzePlacement and emits a Diagnostic only
 * for entities whose verdict matches `id` — verdicts never overlap by construction.
 */
export function makeThinPlacementRule(
  id: PlacementVerdict['ruleId'],
  defaultSeverity: ActiveSeverity,
): GraphRule {
  return {
    id,
    pack: 'placement',
    engine: 'graph',
    defaultSeverity,
    check: (graph, config, context): Diagnostic[] => {
      const out: Diagnostic[] = [];
      for (const verdict of analyzePlacement(graph, config).values()) {
        if (verdict.ruleId === id) {
          out.push(verdictToDiagnostic(verdict, context.severity));
        }
      }
      return out;
    },
  };
}
