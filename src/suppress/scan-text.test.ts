/**
 * @fileoverview Tests for the @arch-decision comment-text scanner — all three §9 forms.
 */
import { describe, it, expect } from 'vitest';
import { scanSuppressText } from './scan-text.js';
import type { Location } from '../types.js';

const loc: Location = { file: 'src/a.ts', line: 1, column: 1 };

describe('scanSuppressText — broad form', () => {
  it('returns null when marker is absent', () => {
    expect(scanSuppressText('just a normal comment', '@arch-decision', loc)).toBeNull();
  });

  it('parses broad @arch-decision: <reason>', () => {
    const r = scanSuppressText('@arch-decision: legacy module kept on purpose', '@arch-decision', loc);
    expect(r).toEqual({
      ruleId: null,
      reasonText: 'legacy module kept on purpose',
      expiryText: null,
      location: loc,
    });
  });

  it('trims surrounding whitespace and leading comment glyphs', () => {
    const r = scanSuppressText('   @arch-decision:   spaced reason   ', '@arch-decision', loc);
    expect(r?.reasonText).toBe('spaced reason');
  });

  it('treats marker with empty reason as empty reasonText, not null', () => {
    const r = scanSuppressText('@arch-decision:', '@arch-decision', loc);
    expect(r).toEqual({ ruleId: null, reasonText: '', expiryText: null, location: loc });
  });
});

describe('scanSuppressText — rule-scoped form', () => {
  it('parses @arch-decision[<ruleId>]: <reason>', () => {
    const r = scanSuppressText(
      '@arch-decision[lca-placement]: intentional cross-branch import',
      '@arch-decision',
      loc,
    );
    expect(r).toEqual({
      ruleId: 'lca-placement',
      reasonText: 'intentional cross-branch import',
      expiryText: null,
      location: loc,
    });
  });

  it('reports empty brackets as an empty-string ruleId (caller flags malformed)', () => {
    const r = scanSuppressText('@arch-decision[]: some reason here', '@arch-decision', loc);
    expect(r?.ruleId).toBe('');
  });

  it('tolerates whitespace inside and around the bracket', () => {
    const r = scanSuppressText('@arch-decision [ slots-privacy ] : reason text', '@arch-decision', loc);
    expect(r?.ruleId).toBe(' slots-privacy ');
    expect(r?.reasonText).toBe('reason text');
  });

  it('keeps ruleId null when no bracket is present', () => {
    const r = scanSuppressText('@arch-decision: broad reason', '@arch-decision', loc);
    expect(r?.ruleId).toBeNull();
  });
});

describe('scanSuppressText — until-expiry form', () => {
  it('splits "until <date>, <reason>" into expiryText and reasonText', () => {
    const r = scanSuppressText(
      '@arch-decision[lca-placement]: until 2026-12-31, migration in progress',
      '@arch-decision',
      loc,
    );
    expect(r).toEqual({
      ruleId: 'lca-placement',
      reasonText: 'migration in progress',
      expiryText: '2026-12-31',
      location: loc,
    });
  });

  it('supports until on the broad form', () => {
    const r = scanSuppressText(
      '@arch-decision: until 2027-01-15, broad temporary waiver',
      '@arch-decision',
      loc,
    );
    expect(r).toEqual({
      ruleId: null,
      reasonText: 'broad temporary waiver',
      expiryText: '2027-01-15',
      location: loc,
    });
  });

  it('keeps full ISO datetime in expiryText', () => {
    const r = scanSuppressText(
      '@arch-decision: until 2026-09-01T00:00:00Z, reason after datetime',
      '@arch-decision',
      loc,
    );
    expect(r?.expiryText).toBe('2026-09-01T00:00:00Z');
    expect(r?.reasonText).toBe('reason after datetime');
  });

  it('does not treat a reason that merely starts with "until" as an expiry', () => {
    const r = scanSuppressText('@arch-decision: untilable reasons exist', '@arch-decision', loc);
    expect(r?.expiryText).toBeNull();
    expect(r?.reasonText).toBe('untilable reasons exist');
  });

  it('captures expiry even when reason after the comma is empty', () => {
    const r = scanSuppressText('@arch-decision: until 2026-12-31,', '@arch-decision', loc);
    expect(r?.expiryText).toBe('2026-12-31');
    expect(r?.reasonText).toBe('');
  });
});
