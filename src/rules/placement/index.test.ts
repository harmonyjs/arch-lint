/**
 * @fileoverview Tests for the placement pack aggregate — rule metadata plus
 * verdict-routing coverage shared across the family.
 */
import { describe, expect, it } from 'vitest';
import type { ResolvedConfig } from '#foundation/config/types.js';
import type { ActiveSeverity } from '#foundation/types/index.js';
import type { GraphRule } from '#platform/engine/types.js';
import { makeContext } from '#rules/test-support/make-context.js';
import { makeGraph } from '#rules/test-support/make-graph.js';
import { only } from '#rules/test-support/only.js';
import { placementRules } from './index.js';

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

/** The placement rules and their canonical default severities. */
const expectedRules: readonly { readonly id: string; readonly defaultSeverity: ActiveSeverity }[] =
  [
    { id: 'lca-placement', defaultSeverity: 'warning' },
    { id: 'slots-privacy', defaultSeverity: 'error' },
    { id: 'siblings-forbidden', defaultSeverity: 'error' },
    { id: 'empty-items-folder', defaultSeverity: 'warning' },
  ];

const rulesById = new Map(placementRules.map((r) => [r.id, r]));

/** Looks up a placement rule by id, failing the test when it is not registered. */
function getRule(id: string): GraphRule {
  const rule = rulesById.get(id);
  if (rule === undefined) {
    throw new Error(`expected a registered rule with id ${id}`);
  }
  return rule;
}

describe('placement pack aggregate', () => {
  it('aggregates exactly the four placement rules', () => {
    expect(placementRules).toHaveLength(expectedRules.length);
    expect(rulesById.size).toBe(expectedRules.length);
  });

  for (const expected of expectedRules) {
    describe(expected.id, () => {
      const rule = getRule(expected.id);

      it('has the canonical metadata', () => {
        expect(rule.id).toBe(expected.id);
        expect(rule.pack).toBe('placement');
        expect(rule.engine).toBe('graph');
        expect(rule.defaultSeverity).toBe(expected.defaultSeverity);
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
