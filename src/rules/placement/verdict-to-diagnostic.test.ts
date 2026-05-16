/**
 * @fileoverview Tests for verdictToDiagnostic — PlacementVerdict → Diagnostic conversion.
 */
import { describe, expect, it } from 'vitest';
import type { PlacementVerdict } from './analyze.js';
import { verdictToDiagnostic } from './verdict-to-diagnostic.js';

const verdict: PlacementVerdict = {
  entity: 'src/App/X',
  ruleId: 'lca-placement',
  expected: 'src/App/items/X',
  actual: 'src/App/X',
  consumers: ['src/App/A', 'src/App/B'],
  reason: '2 consumers',
};

describe('verdictToDiagnostic', () => {
  it('maps a verdict onto a Diagnostic with the rule severity', () => {
    const d = verdictToDiagnostic(verdict, 'warning');
    expect(d.ruleId).toBe('lca-placement');
    expect(d.severity).toBe('warning');
    expect(d.entity).toBe('src/App/X');
    expect(d.expected).toBe('src/App/items/X');
    expect(d.actual).toBe('src/App/X');
    expect(d.reason).toBe('2 consumers');
    expect(d.fingerprint).toBeUndefined();
  });

  it('includes a move suggestion targeting the expected path', () => {
    const d = verdictToDiagnostic(verdict, 'error');
    expect(d.suggestions).toContainEqual({
      action: 'move',
      target: 'src/App/items/X',
      rationale: 'relocate the entity to its expected placement',
    });
  });

  it('sets location on the entity path', () => {
    const d = verdictToDiagnostic(verdict, 'warning');
    expect(d.location).toEqual({ file: 'src/App/X', line: 1, column: 1 });
  });
});
