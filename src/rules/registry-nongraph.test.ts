/**
 * @fileoverview Tests that the non-graph packs perfile and hygiene are registered in the rule registry.
 */

import { describe, expect, it } from 'vitest';
import { allRules } from './index.js';

describe('registry — non-graph packs', () => {
  it('includes all 8 perfile rules', () => {
    const perfile = allRules
      .filter((r) => r.pack === 'perfile')
      .map((r) => r.id)
      .sort();
    expect(perfile).toEqual([
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

  it('includes all 4 hygiene rules', () => {
    const hygiene = allRules
      .filter((r) => r.pack === 'hygiene')
      .map((r) => r.id)
      .sort();
    expect(hygiene).toEqual([
      'exact-dependency-versions',
      'npmrc-settings',
      'package-engines',
      'tsconfig-strict',
    ]);
  });

  it('registers 27 rules in total', () => {
    expect(allRules).toHaveLength(27);
  });

  it('has globally unique rule ids', () => {
    const ids = allRules.map((r) => r.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
