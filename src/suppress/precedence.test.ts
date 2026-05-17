/**
 * @fileoverview Tests for specificity-precedence resolution of a suppress stack (§9).
 */
import { describe, expect, it } from 'vitest';
import type { Location } from '../types.js';
import { isSuppressedByStack } from './precedence.js';
import type { ParsedSuppress } from './types.js';

const loc: Location = { file: 'src/a.ts', line: 1, column: 1 };
const NOW = new Date('2026-06-01T00:00:00Z');

function broad(over: Partial<ParsedSuppress>): ParsedSuppress {
  return { ruleId: null, reason: 'a reason long enough', expiry: null, location: loc, ...over };
}

describe('isSuppressedByStack — broad scope', () => {
  it('an empty stack suppresses nothing', () => {
    expect(isSuppressedByStack([], 'lca-placement', NOW)).toBe(false);
  });

  it('a broad no-expiry suppress covers any rule', () => {
    expect(isSuppressedByStack([broad({})], 'lca-placement', NOW)).toBe(true);
    expect(isSuppressedByStack([broad({})], 'slots-privacy', NOW)).toBe(true);
  });

  it('a broad suppress with a future expiry still suppresses', () => {
    const future = broad({ expiry: new Date('2026-12-31T00:00:00Z') });
    expect(isSuppressedByStack([future], 'lca-placement', NOW)).toBe(true);
  });

  it('a broad suppress with a past expiry no longer suppresses', () => {
    const past = broad({ expiry: new Date('2026-01-01T00:00:00Z') });
    expect(isSuppressedByStack([past], 'lca-placement', NOW)).toBe(false);
  });

  it('no-expiry wins over a past expiry within the broad scope', () => {
    const past = broad({ expiry: new Date('2026-01-01T00:00:00Z') });
    const forever = broad({});
    expect(isSuppressedByStack([past, forever], 'lca-placement', NOW)).toBe(true);
  });

  it('the later of two expiries wins within the broad scope', () => {
    const early = broad({ expiry: new Date('2026-02-01T00:00:00Z') });
    const late = broad({ expiry: new Date('2026-12-31T00:00:00Z') });
    expect(isSuppressedByStack([early, late], 'lca-placement', NOW)).toBe(true);
  });
});

describe('isSuppressedByStack — rule-specific overrides broad', () => {
  function scoped(ruleId: string, over: Partial<ParsedSuppress>): ParsedSuppress {
    return { ruleId, reason: 'a reason long enough', expiry: null, location: loc, ...over };
  }

  it('a rule-specific suppress covers its own rule', () => {
    expect(isSuppressedByStack([scoped('lca-placement', {})], 'lca-placement', NOW)).toBe(true);
  });

  it('a rule-specific suppress does not cover other rules', () => {
    expect(isSuppressedByStack([scoped('lca-placement', {})], 'slots-privacy', NOW)).toBe(false);
  });

  it('when a [R] exists, the broad comment is ignored for R', () => {
    const broadForever = broad({});
    const scopedExpired = scoped('lca-placement', { expiry: new Date('2026-01-01T00:00:00Z') });
    expect(isSuppressedByStack([broadForever, scopedExpired], 'lca-placement', NOW)).toBe(false);
  });

  it('a [R] still leaves the broad comment governing other rules', () => {
    const broadForever = broad({});
    const scopedExpired = scoped('lca-placement', { expiry: new Date('2026-01-01T00:00:00Z') });
    expect(isSuppressedByStack([broadForever, scopedExpired], 'slots-privacy', NOW)).toBe(true);
  });

  it('[R]: until <future> overrides a broad forever for R when R-specific wins', () => {
    const broadForever = broad({});
    const scopedFuture = scoped('lca-placement', { expiry: new Date('2026-12-31T00:00:00Z') });
    expect(isSuppressedByStack([broadForever, scopedFuture], 'lca-placement', NOW)).toBe(true);
  });

  it('the most generous expiry wins among several [R] comments', () => {
    const scopedEarly = scoped('lca-placement', { expiry: new Date('2026-02-01T00:00:00Z') });
    const scopedForever = scoped('lca-placement', {});
    expect(isSuppressedByStack([scopedEarly, scopedForever], 'lca-placement', NOW)).toBe(true);
  });
});
