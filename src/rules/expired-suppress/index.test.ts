/**
 * @fileoverview Tests for the expired-suppress rule.
 */
import { describe, it, expect } from 'vitest';
import { expiredSuppressRule } from './index.js';
import { makeGraph } from '../test-support/make-graph.js';
import { makeContext, makeSuppressIndex } from '../test-support/make-context.js';
import type { ParsedSuppress, ResolvedConfig } from '../../types.js';

const cfg = {} as ResolvedConfig;
const g = makeGraph({});

describe('expiredSuppressRule', () => {
  it('has the canonical metadata', () => {
    expect(expiredSuppressRule.id).toBe('expired-suppress');
    expect(expiredSuppressRule.pack).toBe('meta');
    expect(expiredSuppressRule.engine).toBe('meta');
    expect(expiredSuppressRule.defaultSeverity).toBe('warning');
  });

  it('emits a diagnostic per expired suppress', () => {
    const expired: ParsedSuppress = {
      ruleId: 'lca-placement',
      reason: 'temporary placement decision',
      expiry: new Date('2024-01-01'),
      location: { file: 'src/App/App.tsx', line: 3, column: 1 },
    };
    const ctx = makeContext('expired-suppress', { suppress: makeSuppressIndex({ expired: [expired] }) });
    const out = expiredSuppressRule.check(g, cfg, ctx);
    expect(out).toHaveLength(1);
    expect(out[0]!.ruleId).toBe('expired-suppress');
    expect(out[0]!.entity).toBe('src/App/App.tsx');
    expect(out[0]!.fingerprint?.startsWith('lca-placement#')).toBe(true);
  });

  it("uses '*' in the fingerprint for an untargeted suppress", () => {
    const expired: ParsedSuppress = {
      ruleId: null,
      reason: 'broad architectural exemption',
      expiry: null,
      location: { file: 'src/x.ts', line: 1, column: 1 },
    };
    const ctx = makeContext('expired-suppress', { suppress: makeSuppressIndex({ expired: [expired] }) });
    const out = expiredSuppressRule.check(g, cfg, ctx);
    expect(out[0]!.fingerprint?.startsWith('*#')).toBe(true);
  });

  it('deduplicates two suppresses with the same ruleId and reason', () => {
    const a: ParsedSuppress = {
      ruleId: 'slots-privacy', reason: 'same reason text',
      expiry: new Date('2020-01-01'), location: { file: 'src/x.ts', line: 1, column: 1 },
    };
    const b: ParsedSuppress = { ...a, location: { file: 'src/x.ts', line: 8, column: 1 } };
    const ctx = makeContext('expired-suppress', { suppress: makeSuppressIndex({ expired: [a, b] }) });
    expect(expiredSuppressRule.check(g, cfg, ctx)).toHaveLength(1);
  });

  it('emits nothing when there are no expired suppresses', () => {
    expect(expiredSuppressRule.check(g, cfg, makeContext('expired-suppress'))).toEqual([]);
  });
});
