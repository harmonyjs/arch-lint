/**
 * @fileoverview Tests for the perfile pack rule aggregate.
 */
import { describe, expect, it } from 'vitest';
import { perfileRules } from './index.js';

describe('perfileRules', () => {
  it('exports exactly the 8 perfile rules', () => {
    expect(perfileRules.map((r) => r.id).sort()).toEqual([
      'complexity',
      'file-description-required',
      'max-lines',
      'max-lines-per-function',
      'max-optional-params',
      'max-params',
      'no-default-export',
      'single-entity-per-file',
    ]);
  });

  it('every rule has pack perfile and engine syntactic', () => {
    for (const rule of perfileRules) {
      expect(rule.pack).toBe('perfile');
      expect(rule.engine).toBe('syntactic');
    }
  });

  it('has no duplicate rule ids', () => {
    const ids = perfileRules.map((r) => r.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
