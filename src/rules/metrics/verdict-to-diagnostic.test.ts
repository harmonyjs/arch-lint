/**
 * @fileoverview Tests for the shared metrics verdict→Diagnostic projection.
 */
import { describe, expect, it } from 'vitest';
import { type MetricsVerdict, verdictToDiagnostic } from './verdict-to-diagnostic.js';

const verdict: MetricsVerdict = {
  ruleId: 'afferent-coupling',
  entity: 'src/graph',
  fingerprint: 'afferent-coupling#graph',
  message: 'subsystem graph is depended on by many subsystems',
  expected: '≤ 1 inbound subsystem dependencies',
  actual: '2 (report, runner)',
  reason: 'a widely-depended-on subsystem is a high-blast-radius change point',
  suggestion: 'confirm this is a deliberate shared subsystem; if not, split it by client',
};

describe('verdictToDiagnostic', () => {
  it('builds a Diagnostic carrying every verdict field', () => {
    const d = verdictToDiagnostic(verdict, 'info');
    expect(d.ruleId).toBe('afferent-coupling');
    expect(d.severity).toBe('info');
    expect(d.entity).toBe('src/graph');
    expect(d.fingerprint).toBe('afferent-coupling#graph');
    expect(d.message).toBe('subsystem graph is depended on by many subsystems');
    expect(d.expected).toBe('≤ 1 inbound subsystem dependencies');
    expect(d.actual).toBe('2 (report, runner)');
    expect(d.reason).toBe('a widely-depended-on subsystem is a high-blast-radius change point');
    expect(d.suggestions).toEqual([{ action: 'custom', rationale: verdict.suggestion }]);
    expect(d.location).toEqual({ file: 'src/graph', line: 1, column: 1 });
  });
});
