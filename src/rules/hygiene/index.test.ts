/**
 * @fileoverview Tests for the hygiene pack rule aggregate.
 */

import { describe, expect, it } from 'vitest';
import { hygieneRules } from './index.js';

describe('hygieneRules', () => {
  it('exports exactly the 4 hygiene rules', () => {
    expect(hygieneRules.map((r) => r.id).sort()).toEqual([
      'exact-dependency-versions',
      'npmrc-settings',
      'package-engines',
      'tsconfig-strict',
    ]);
  });

  it('every rule has pack hygiene and engine manifest', () => {
    for (const rule of hygieneRules) {
      expect(rule.pack).toBe('hygiene');
      expect(rule.engine).toBe('manifest');
    }
  });

  it('has no duplicate rule ids', () => {
    const ids = hygieneRules.map((r) => r.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
