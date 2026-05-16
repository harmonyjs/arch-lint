/**
 * @fileoverview Tests for the slots-privacy rule.
 */
import { describe, expect, it } from 'vitest';
import type { ResolvedConfig } from '../../../types.js';
import { makeContext } from '../../test-support/make-context.js';
import { makeGraph } from '../../test-support/make-graph.js';
import { slotsPrivacyRule } from './index.js';

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

describe('slotsPrivacyRule', () => {
  it('has the canonical metadata', () => {
    expect(slotsPrivacyRule.id).toBe('slots-privacy');
    expect(slotsPrivacyRule.pack).toBe('placement');
    expect(slotsPrivacyRule.engine).toBe('structural');
    expect(slotsPrivacyRule.defaultSeverity).toBe('error');
  });

  it('emits an error for a slots-privacy verdict', () => {
    const g = makeGraph({
      nodes: {
        'src/App': { kind: 'folder', isEntity: true },
        'src/App/Header': { kind: 'folder', isEntity: true },
        'src/App/Footer': { kind: 'folder', isEntity: true },
        'src/App/Header/slots/Leaked': { kind: 'folder', isEntity: true },
      },
      entityConsumers: { 'src/App/Header/slots/Leaked': ['src/App/Header', 'src/App/Footer'] },
    });
    const out = slotsPrivacyRule.check(
      g,
      cfg(),
      makeContext('slots-privacy', { severity: 'error' }),
    );
    expect(out).toHaveLength(1);
    expect(out[0]!.ruleId).toBe('slots-privacy');
    expect(out[0]!.severity).toBe('error');
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
      slotsPrivacyRule.check(g, cfg(), makeContext('slots-privacy', { severity: 'error' })),
    ).toEqual([]);
  });
});
