/**
 * @fileoverview Tests for the empty-items-folder rule.
 */
import { describe, expect, it } from 'vitest';
import type { ResolvedConfig } from '../../../config/types.js';
import { makeContext } from '../../test-support/make-context.js';
import { makeGraph } from '../../test-support/make-graph.js';
import { emptyItemsFolderRule } from './index.js';

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

describe('emptyItemsFolderRule', () => {
  it('has the canonical metadata', () => {
    expect(emptyItemsFolderRule.id).toBe('empty-items-folder');
    expect(emptyItemsFolderRule.pack).toBe('placement');
    expect(emptyItemsFolderRule.engine).toBe('structural');
    expect(emptyItemsFolderRule.defaultSeverity).toBe('warning');
  });

  it('emits a diagnostic for an empty-items-folder verdict', () => {
    const g = makeGraph({
      nodes: {
        'src/App': { kind: 'folder', isEntity: true },
        'src/App/Header': { kind: 'folder', isEntity: true },
        'src/App/items/Underused': { kind: 'folder', isEntity: true },
      },
      entityConsumers: { 'src/App/items/Underused': ['src/App/Header'] },
    });
    const out = emptyItemsFolderRule.check(g, cfg(), makeContext('empty-items-folder'));
    expect(out).toHaveLength(1);
    expect(out[0]!.ruleId).toBe('empty-items-folder');
  });

  it('does not emit for a slots-privacy verdict', () => {
    const g = makeGraph({
      nodes: {
        'src/App': { kind: 'folder', isEntity: true },
        'src/App/Header': { kind: 'folder', isEntity: true },
        'src/App/Footer': { kind: 'folder', isEntity: true },
        'src/App/Header/slots/Leaked': { kind: 'folder', isEntity: true },
      },
      entityConsumers: { 'src/App/Header/slots/Leaked': ['src/App/Header', 'src/App/Footer'] },
    });
    expect(emptyItemsFolderRule.check(g, cfg(), makeContext('empty-items-folder'))).toEqual([]);
  });
});
