/**
 * @fileoverview Builds a thin placement Rule that projects one §7.3 verdict ruleId (D3).
 */

import type { Diagnostic } from '#foundation/types/index.js';
import type { GraphRule } from '#platform/engine/types.js';
import { analyzePlacement } from './analyze.js';
import type { PlacementRuleDescriptor } from './family.js';
import { verdictToDiagnostic } from './verdict-to-diagnostic.js';

/**
 * Builds a placement Rule that calls analyzePlacement and emits a Diagnostic only for
 * entities whose verdict matches `spec.id` — verdicts never overlap by construction.
 */
export function makeThinPlacementRule(spec: PlacementRuleDescriptor): GraphRule {
  return {
    id: spec.id,
    pack: 'placement',
    engine: 'graph',
    defaultSeverity: spec.defaultSeverity,
    check: (graph, config, context): Diagnostic[] => {
      const out: Diagnostic[] = [];
      for (const verdict of analyzePlacement(graph, config).values()) {
        if (verdict.ruleId === spec.id) {
          out.push(verdictToDiagnostic(verdict, context.severity));
        }
      }
      return out;
    },
  };
}
