/**
 * @fileoverview Tests for dedupPlacement — the defensive placement-dedup engine step.
 */
import { describe, expect, it } from 'vitest';
import type { Diagnostic } from '../types.js';
import { dedupPlacement } from './dedup-placement.js';

function diag(ruleId: string, entity: string): Diagnostic {
  return {
    ruleId,
    severity: 'warning',
    entity,
    message: 'm',
    actual: 'a',
    reason: 'r',
    suggestions: [],
    location: { file: entity, line: 1, column: 1 },
  };
}

describe('dedupPlacement', () => {
  it('is a no-op when each entity has at most one placement diagnostic', () => {
    const diags = [diag('lca-placement', 'src/A'), diag('slots-privacy', 'src/B')];
    expect(dedupPlacement(diags)).toEqual(diags);
  });

  it('passes non-placement diagnostics through untouched', () => {
    const diags = [diag('layer-boundary', 'src/A'), diag('lib-purity', 'src/A')];
    expect(dedupPlacement(diags)).toEqual(diags);
  });

  it('keeps the §7.3 winner when an entity has colliding placement diagnostics', () => {
    const diags = [diag('lca-placement', 'src/A'), diag('slots-privacy', 'src/A')];
    const out = dedupPlacement(diags);
    expect(out).toHaveLength(1);
    expect(out[0]!.ruleId).toBe('slots-privacy');
  });

  it('discards a lower-priority diagnostic that arrives after the winner', () => {
    const diags = [diag('slots-privacy', 'src/A'), diag('lca-placement', 'src/A')];
    const out = dedupPlacement(diags);
    expect(out).toHaveLength(1);
    expect(out[0]!.ruleId).toBe('slots-privacy');
  });

  it('prefers empty-items-folder over siblings-forbidden and lca-placement', () => {
    const diags = [
      diag('lca-placement', 'src/A'),
      diag('siblings-forbidden', 'src/A'),
      diag('empty-items-folder', 'src/A'),
    ];
    const out = dedupPlacement(diags);
    expect(out).toHaveLength(1);
    expect(out[0]!.ruleId).toBe('empty-items-folder');
  });
});
