/**
 * @fileoverview Tests for verdictToDiagnostic — projecting a metrics verdict
 * (with structured suggestions and optional analysis) into a Diagnostic.
 */
import { describe, expect, it } from 'vitest';
import { verdictToDiagnostic } from './verdict-to-diagnostic.js';

describe('verdictToDiagnostic', () => {
  it('carries structured suggestions and analysis onto the diagnostic', () => {
    const d = verdictToDiagnostic(
      {
        ruleId: 'afferent-coupling',
        entity: 'u',
        fingerprint: 'afferent-coupling#u',
        message: 'm',
        expected: 'e',
        actual: 'a',
        reason: 'r',
        suggestions: [{ action: 'split', rationale: 'split it' }],
        analysis: { kind: 'coupling-facets', facets: [], disjoint: true },
      },
      'warning',
    );
    expect(d.suggestions).toEqual([{ action: 'split', rationale: 'split it' }]);
    expect(d.analysis?.kind).toBe('coupling-facets');
  });

  it('omits analysis when the verdict has none', () => {
    const d = verdictToDiagnostic(
      {
        ruleId: 'instability',
        entity: 'u',
        fingerprint: 'instability#u',
        message: 'm',
        expected: 'e',
        actual: 'a',
        reason: 'r',
        suggestions: [{ action: 'custom', rationale: 'advice' }],
      },
      'info',
    );
    expect(d.analysis).toBeUndefined();
  });
});
