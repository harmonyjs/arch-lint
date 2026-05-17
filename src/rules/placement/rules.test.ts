/**
 * @fileoverview Parameterized tests for the placement rule family — one case
 * per descriptor, plus verdict-routing coverage shared across the family.
 */
import { describe, expect, it } from 'vitest';
import type { ResolvedConfig } from '../../config/types.js';
import type { GraphRule } from '../types.js';
import { makeContext } from '../test-support/make-context.js';
import { makeGraph } from '../test-support/make-graph.js';
import { only } from '../test-support/only.js';
import { registerPlacementRules } from './register.js';
import { placementRuleDescriptors } from './rules.js';

function cfg(): ResolvedConfig {
  return {
    project: { sourceRoot: 'src' },
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

const rulesById = new Map(registerPlacementRules().map((r) => [r.id, r]));

/** Looks up a placement rule by id, failing the test when it is not registered. */
function getRule(id: string): GraphRule {
  const rule = rulesById.get(id);
  if (rule === undefined) {
    throw new Error(`expected a registered rule with id ${id}`);
  }
  return rule;
}

describe('placement rule family', () => {
  it('builds exactly one Rule per descriptor', () => {
    expect(rulesById.size).toBe(placementRuleDescriptors.length);
  });

  for (const descriptor of placementRuleDescriptors) {
    describe(descriptor.id, () => {
      const rule = getRule(descriptor.id);

      it('has the canonical metadata', () => {
        expect(rule.id).toBe(descriptor.id);
        expect(rule.pack).toBe('placement');
        expect(rule.engine).toBe('graph');
        expect(rule.defaultSeverity).toBe(descriptor.defaultSeverity);
      });
    });
  }

  it('empty-items-folder emits for an empty-items-folder verdict only', () => {
    const rule = getRule('empty-items-folder');
    const g = makeGraph({
      nodes: {
        'src/App': { kind: 'folder', isEntity: true },
        'src/App/Header': { kind: 'folder', isEntity: true },
        'src/App/items/Underused': { kind: 'folder', isEntity: true },
      },
      entityConsumers: { 'src/App/items/Underused': ['src/App/Header'] },
    });
    const out = rule.check(g, cfg(), makeContext('empty-items-folder'));
    expect(only(out).ruleId).toBe('empty-items-folder');
  });

  it('empty-items-folder does not emit for a slots-privacy verdict', () => {
    const rule = getRule('empty-items-folder');
    const g = makeGraph({
      nodes: {
        'src/App': { kind: 'folder', isEntity: true },
        'src/App/Header': { kind: 'folder', isEntity: true },
        'src/App/Footer': { kind: 'folder', isEntity: true },
        'src/App/Header/slots/Leaked': { kind: 'folder', isEntity: true },
      },
      entityConsumers: { 'src/App/Header/slots/Leaked': ['src/App/Header', 'src/App/Footer'] },
    });
    expect(rule.check(g, cfg(), makeContext('empty-items-folder'))).toEqual([]);
  });
});
