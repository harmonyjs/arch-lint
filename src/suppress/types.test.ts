/**
 * @fileoverview Type-level smoke test for M3-internal suppress types.
 */
import { describe, it, expect } from 'vitest';
import type {
  MalformedKind,
  MalformedSuppress,
  RawSuppressComment,
  EntitySuppressData,
} from './types.js';

describe('suppress/types', () => {
  it('MalformedSuppress accepts every malformed kind', () => {
    const kinds: MalformedKind[] = [
      'missing-reason',
      'short-reason',
      'bad-expiry',
      'empty-rule-id',
      'no-main-export',
    ];
    const samples: MalformedSuppress[] = kinds.map((kind) => ({
      kind,
      ruleId: null,
      reason: undefined,
      location: { file: 'src/a.ts', line: 1, column: 1 },
    }));
    expect(samples).toHaveLength(5);
  });

  it('RawSuppressComment and EntitySuppressData are constructible', () => {
    const raw: RawSuppressComment = {
      ruleId: 'lca-placement',
      reasonText: 'deliberate placement decision',
      expiryText: null,
      location: { file: 'src/a.ts', line: 2, column: 1 },
    };
    const data: EntitySuppressData = { valid: [], malformed: [] };
    expect(raw.ruleId).toBe('lca-placement');
    expect(data.valid).toEqual([]);
  });
});
