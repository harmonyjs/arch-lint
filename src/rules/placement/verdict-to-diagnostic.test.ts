/**
 * @fileoverview Tests for verdictToDiagnostic — PlacementVerdict → Diagnostic conversion.
 */
import { describe, expect, it } from 'vitest';
import type { PlacementVerdict } from './analyze.js';
import { verdictToDiagnostic } from './verdict-to-diagnostic.js';

const lcaVerdict: PlacementVerdict = {
  entity: 'src/App/Stray',
  ruleId: 'lca-placement',
  expected: 'src/App/Deep',
  actual: 'src/App/Stray',
  consumers: ['src/App/Deep/A', 'src/App/Deep/B'],
  reason: '2 consumer(s), entity outside its LCA subtree',
};

const roleVerdict: PlacementVerdict = {
  entity: 'src/App/Header/slots/Leaked',
  ruleId: 'slots-privacy',
  expected: 'src/App/items/Leaked',
  actual: 'src/App/Header/slots/Leaked',
  consumers: ['src/App/Header', 'src/App/Footer'],
  reason: 'entity in a private slot but imported by 2 consumer(s)',
};

describe('verdictToDiagnostic — lca-placement', () => {
  it('maps a verdict onto a Diagnostic with the rule severity', () => {
    const d = verdictToDiagnostic(lcaVerdict, 'warning');
    expect(d.ruleId).toBe('lca-placement');
    expect(d.severity).toBe('warning');
    expect(d.entity).toBe('src/App/Stray');
    expect(d.expected).toBe('src/App/Deep');
    expect(d.actual).toBe('src/App/Stray');
    expect(d.reason).toBe('2 consumer(s), entity outside its LCA subtree');
    expect(d.fingerprint).toBeUndefined();
  });

  it('reads the message as a locality violation against the LCA directory', () => {
    const d = verdictToDiagnostic(lcaVerdict, 'warning');
    expect(d.message).toBe(
      'src/App/Stray is consumed from within src/App/Deep but placed outside it',
    );
  });

  it('includes a move suggestion targeting the LCA directory', () => {
    const d = verdictToDiagnostic(lcaVerdict, 'error');
    expect(d.suggestions).toContainEqual({
      action: 'move',
      target: 'src/App/Deep',
      rationale: 'relocate the entity inside its LCA subtree',
    });
  });

  it('sets location on the entity path', () => {
    const d = verdictToDiagnostic(lcaVerdict, 'warning');
    expect(d.location).toEqual({ file: 'src/App/Stray', line: 1, column: 1 });
  });
});

describe('verdictToDiagnostic — role-folder verdicts', () => {
  it('keeps the misplaced-expected message for a role-folder verdict', () => {
    const d = verdictToDiagnostic(roleVerdict, 'error');
    expect(d.ruleId).toBe('slots-privacy');
    expect(d.message).toBe(
      'src/App/Header/slots/Leaked is misplaced — expected src/App/items/Leaked',
    );
  });

  it('includes a move suggestion targeting the role-folder path', () => {
    const d = verdictToDiagnostic(roleVerdict, 'error');
    expect(d.suggestions).toContainEqual({
      action: 'move',
      target: 'src/App/items/Leaked',
      rationale: 'relocate the entity to its expected placement',
    });
  });
});
