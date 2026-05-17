/**
 * @fileoverview Tests for classifyDiagnostics — assigns new / inBaseline status (D2).
 */
import { describe, expect, it } from 'vitest';
import type { Diagnostic, Location } from '../types.js';
import { classifyDiagnostics } from './classify.js';
import type { BaselineFile } from './types.js';

const loc: Location = { file: 'src/a.ts', line: 1, column: 1 };

function diag(over: Partial<Diagnostic>): Diagnostic {
  return {
    ruleId: 'lca-placement',
    severity: 'warning',
    entity: 'src/Widget',
    actual: 'src/Widget',
    message: 'm',
    reason: 'r',
    suggestions: [],
    location: loc,
    ...over,
  };
}

function baseline(records: BaselineFile['records']): BaselineFile {
  return { schemaVersion: 1, generatedAt: 'x', generatorVersion: '1.0.0', records };
}

describe('classifyDiagnostics', () => {
  it('marks every diagnostic as new when baseline is null', () => {
    const out = classifyDiagnostics([diag({}), diag({ entity: 'src/Other' })], null);
    expect(out.every((d) => d.status === 'new')).toBe(true);
  });

  it('marks every diagnostic as new for an empty baseline', () => {
    const out = classifyDiagnostics([diag({})], baseline([]));
    expect(out[0]?.status).toBe('new');
  });

  it('marks a diagnostic inBaseline when (ruleId, entity) matches', () => {
    const out = classifyDiagnostics(
      [diag({})],
      baseline([{ ruleId: 'lca-placement', entity: 'src/Widget' }]),
    );
    expect(out[0]?.status).toBe('inBaseline');
  });

  it('does not match when ruleId differs', () => {
    const out = classifyDiagnostics(
      [diag({})],
      baseline([{ ruleId: 'slots-privacy', entity: 'src/Widget' }]),
    );
    expect(out[0]?.status).toBe('new');
  });

  it('matches on (ruleId, entity, fingerprint) when fingerprint is present', () => {
    const out = classifyDiagnostics(
      [diag({ fingerprint: 'src/a.ts#src/b.ts' })],
      baseline([
        { ruleId: 'lca-placement', entity: 'src/Widget', fingerprint: 'src/a.ts#src/b.ts' },
      ]),
    );
    expect(out[0]?.status).toBe('inBaseline');
  });

  it('does not match a fingerprinted diagnostic against a fingerprint-less record', () => {
    const out = classifyDiagnostics(
      [diag({ fingerprint: 'src/a.ts#src/b.ts' })],
      baseline([{ ruleId: 'lca-placement', entity: 'src/Widget' }]),
    );
    expect(out[0]?.status).toBe('new');
  });

  it('does not match a fingerprint-less diagnostic against a fingerprinted record', () => {
    const out = classifyDiagnostics(
      [diag({})],
      baseline([{ ruleId: 'lca-placement', entity: 'src/Widget', fingerprint: 'x' }]),
    );
    expect(out[0]?.status).toBe('new');
  });

  it('returns new Diagnostic objects without mutating the inputs', () => {
    const input = diag({});
    const out = classifyDiagnostics([input], baseline([]));
    expect(out[0]).not.toBe(input);
    expect(input.status).toBeUndefined();
  });

  it('classifies a mixed batch independently per diagnostic', () => {
    const out = classifyDiagnostics(
      [diag({}), diag({ entity: 'src/New' })],
      baseline([{ ruleId: 'lca-placement', entity: 'src/Widget' }]),
    );
    expect(out.map((d) => d.status)).toEqual(['inBaseline', 'new']);
  });
});
