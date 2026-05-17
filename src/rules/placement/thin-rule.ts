/**
 * @fileoverview Builds a thin placement Rule that projects one §7.3 verdict ruleId (D3).
 */

import type { ActiveSeverity, Diagnostic } from '../../types.js';
import type { GraphRule } from '../types.js';
import { analyzePlacement, type PlacementVerdict } from './analyze.js';
import { verdictToDiagnostic } from './verdict-to-diagnostic.js';

/** Metadata describing one thin placement rule. */
export interface ThinRuleSpec {
  readonly id: PlacementVerdict['ruleId'];
  readonly defaultSeverity: ActiveSeverity;
}

/**
 * Builds a placement Rule that calls analyzePlacement and emits a Diagnostic only for
 * entities whose §7.3 verdict matches `spec.id` — verdicts never overlap by construction.
 */
export function makeThinPlacementRule(spec: ThinRuleSpec): GraphRule {
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
