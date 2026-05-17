/**
 * @fileoverview Tests for the siblings-forbidden rule.
 */
import { describe, expect, it } from 'vitest';
import type { ResolvedConfig } from '../../../config/types.js';
import { makeContext } from '../../test-support/make-context.js';
import { makeGraph } from '../../test-support/make-graph.js';
import { siblingsForbiddenRule } from './index.js';

function cfg(): ResolvedConfig {
  return {
    conventions: {
      privateSegment: 'slots',
      sharedSegment: 'items',
      libSegment: 'lib',
      hooksSegment: 'hooks',
      explicitClusterSegment: 'ui',
      modelSegment: 'model',
      indexFiles: ['index.ts', 'index.tsx'],
    },
    layers: {},
    rules: { 'lca-placement': { severity: 'warning', promotionThreshold: 2 } },
  } as unknown as ResolvedConfig;
}

describe('siblingsForbiddenRule', () => {
  it('has the canonical metadata', () => {
    expect(siblingsForbiddenRule.id).toBe('siblings-forbidden');
    expect(siblingsForbiddenRule.pack).toBe('placement');
    expect(siblingsForbiddenRule.engine).toBe('structural');
    expect(siblingsForbiddenRule.defaultSeverity).toBe('error');
  });

  it('emits an error for a siblings-forbidden verdict', () => {
    const g = makeGraph({
      nodes: {
        'src/App': { kind: 'folder', isEntity: true },
        'src/App/Header': { kind: 'folder', isEntity: true },
        'src/App/Footer': { kind: 'folder', isEntity: true },
      },
      entityConsumers: { 'src/App/Header': ['src/App/Footer'] },
    });
    const out = siblingsForbiddenRule.check(
      g,
      cfg(),
      makeContext('siblings-forbidden', { severity: 'error' }),
    );
    expect(out).toHaveLength(1);
    expect(out[0]!.ruleId).toBe('siblings-forbidden');
  });

  it('does not emit for an lca-placement verdict', () => {
    const g = makeGraph({
      nodes: {
        'src/App': { kind: 'folder', isEntity: true },
        'src/App/Deep': { kind: 'folder', isEntity: true },
        'src/App/Deep/A': { kind: 'folder', isEntity: true },
        'src/App/Deep/B': { kind: 'folder', isEntity: true },
        'src/App/Stray': { kind: 'folder', isEntity: true },
      },
      entityConsumers: { 'src/App/Stray': ['src/App/Deep/A', 'src/App/Deep/B'] },
    });
    expect(
      siblingsForbiddenRule.check(
        g,
        cfg(),
        makeContext('siblings-forbidden', { severity: 'error' }),
      ),
    ).toEqual([]);
  });
});
