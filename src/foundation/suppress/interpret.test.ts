/**
 * @fileoverview Tests for semantic interpretation of raw @arch-decision comments.
 */
import { describe, expect, it } from 'vitest';
import type { SuppressConfig } from '#foundation/config/types.js';
import type { Location } from '#foundation/types/index.js';
import { interpretSuppress } from './interpret.js';
import type { RawSuppressComment } from './types.js';

const loc: Location = { file: 'src/a.ts', line: 1, column: 1 };

const cfg: SuppressConfig = {
  marker: '@arch-decision',
  minReasonLength: 12,
  expirySupport: true,
  scanLocations: ['leading-comment', 'jsdoc'],
  maxDistanceLines: 5,
};

function raw(over: Partial<RawSuppressComment>): RawSuppressComment {
  return {
    ruleId: null,
    reasonText: 'a sufficiently long reason',
    expiryText: null,
    location: loc,
    ...over,
  };
}

describe('interpretSuppress', () => {
  it('produces a valid ParsedSuppress for a well-formed broad comment', () => {
    const r = interpretSuppress(raw({}), cfg);
    expect(r).toEqual({
      ok: true,
      value: { ruleId: null, reason: 'a sufficiently long reason', expiry: null, location: loc },
    });
  });

  it('flags missing reason', () => {
    const r = interpretSuppress(raw({ reasonText: '' }), cfg);
    expect(r).toEqual({
      ok: false,
      value: { kind: 'missing-reason', ruleId: null, reason: undefined, location: loc },
    });
  });

  it('flags a reason shorter than minReasonLength', () => {
    const r = interpretSuppress(raw({ reasonText: 'too short' }), cfg);
    expect(r).toEqual({
      ok: false,
      value: { kind: 'short-reason', ruleId: null, reason: 'too short', location: loc },
    });
  });

  it('flags empty bracket as empty-rule-id', () => {
    const r = interpretSuppress(raw({ ruleId: '' }), cfg);
    expect(r.ok).toBe(false);
    expect(r.ok === false && r.value.kind).toBe('empty-rule-id');
  });

  it('trims a rule-scoped ruleId', () => {
    const r = interpretSuppress(raw({ ruleId: '  lca-placement  ' }), cfg);
    expect(r.ok === true && r.value.ruleId).toBe('lca-placement');
  });

  it('parses a valid ISO date into an expiry Date', () => {
    const r = interpretSuppress(raw({ expiryText: '2026-12-31' }), cfg);
    expect(r.ok === true && r.value.expiry?.toISOString()).toBe('2026-12-31T00:00:00.000Z');
  });

  it('flags a non-ISO expiry as bad-expiry while still keeping the reason', () => {
    const r = interpretSuppress(raw({ expiryText: 'next-friday' }), cfg);
    expect(r).toEqual({
      ok: false,
      value: {
        kind: 'bad-expiry',
        ruleId: null,
        reason: 'a sufficiently long reason',
        location: loc,
      },
    });
  });

  it('forces expiry to null when expirySupport is disabled', () => {
    const r = interpretSuppress(raw({ expiryText: '2026-12-31' }), {
      ...cfg,
      expirySupport: false,
    });
    expect(r.ok === true && r.value.expiry).toBeNull();
  });

  it('accepts any reason length when minReasonLength is 1', () => {
    const r = interpretSuppress(raw({ reasonText: 'x' }), { ...cfg, minReasonLength: 1 });
    expect(r.ok).toBe(true);
  });
});
