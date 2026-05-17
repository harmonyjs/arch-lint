/**
 * @fileoverview Tests for fingerprint-based diagnostic deduplication done before emit (§10.2).
 */
import { describe, expect, it } from 'vitest';
import type { Diagnostic } from '#types.js';
import { dedupByFingerprint } from './dedup.js';

function diag(ruleId: string, entity: string, fingerprint: string): Diagnostic {
  return {
    ruleId,
    severity: 'error',
    entity,
    fingerprint,
    message: 'm',
    actual: 'a',
    reason: 'r',
    suggestions: [],
    location: { file: entity, line: 1, column: 1 },
  };
}

/** A diagnostic with no fingerprint — built without the key (exactOptionalPropertyTypes). */
function diagNoFp(ruleId: string, entity: string): Diagnostic {
  return {
    ruleId,
    severity: 'error',
    entity,
    message: 'm',
    actual: 'a',
    reason: 'r',
    suggestions: [],
    location: { file: entity, line: 1, column: 1 },
  };
}

describe('dedupByFingerprint', () => {
  it('collapses two entries with the same (ruleId, entity, fingerprint)', () => {
    const input = [diag('r', 'e', 'fp'), diag('r', 'e', 'fp')];
    expect(dedupByFingerprint(input)).toHaveLength(1);
  });

  it('keeps entries with a different fingerprint', () => {
    const input = [diag('r', 'e', 'fp1'), diag('r', 'e', 'fp2')];
    expect(dedupByFingerprint(input)).toHaveLength(2);
  });

  it('keeps entries with a different entity under one fingerprint', () => {
    const input = [diag('r', 'e1', 'fp'), diag('r', 'e2', 'fp')];
    expect(dedupByFingerprint(input)).toHaveLength(2);
  });

  it('keeps entries with a different ruleId under one fingerprint', () => {
    const input = [diag('r1', 'e', 'fp'), diag('r2', 'e', 'fp')];
    expect(dedupByFingerprint(input)).toHaveLength(2);
  });

  it('does not collapse diagnostics that carry no fingerprint', () => {
    const noFp = diagNoFp('r', 'e');
    expect(dedupByFingerprint([noFp, diagNoFp('r', 'e')])).toHaveLength(2);
  });

  it('keeps the first occurrence and preserves order', () => {
    const a = diag('r', 'e', 'fp');
    const b = { ...diag('r', 'e', 'fp'), message: 'second' };
    const out = dedupByFingerprint([a, b]);
    expect(out[0]?.message).toBe('m');
  });
});
