/**
 * @fileoverview Integration test for lca-placement — full check() pipeline over a fixture.
 */
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { runRuleOnFixture } from '#rules/test-support/run-fixture.js';

const fixtureRoot = fileURLToPath(new URL('../fixtures/cousin-placement', import.meta.url));
const repoRoot = fileURLToPath(new URL('../fixtures/repo-root', import.meta.url));

const PLACEMENT_RULES = [
  'lca-placement',
  'slots-privacy',
  'siblings-forbidden',
  'empty-items-folder',
] as const;

describe('lca-placement — integration', () => {
  it('flags a component placed away from its consumers LCA', async () => {
    const diags = await runRuleOnFixture({ fixtureRoot, ruleId: 'lca-placement' });
    expect(diags).toHaveLength(1);
    expect(diags[0]?.ruleId).toBe('lca-placement');
    expect(diags[0]?.entity).toBe('src/App/Right/Cousin');
    expect(diags[0]?.fingerprint).toBeUndefined();
  });

  it.each(['.', './', 'src/', './src'])(
    'flags only that component under sourceRoot "%s"',
    async (sourceRoot) => {
      const diags = await runRuleOnFixture({ fixtureRoot, ruleId: 'lca-placement', sourceRoot });
      expect(diags.map((d) => [d.entity, d.expected])).toEqual([
        ['src/App/Right/Cousin', 'src/App/Left'],
      ]);
    },
  );
});

// The monorepo setup the README recommends: sourceRoot '.' with package-path layer keys.
describe.each([
  { sourceRoot: '.', layers: { 'apps/web': { canImport: [] } } },
  { sourceRoot: './', layers: { 'apps/web': { canImport: [] } } },
  { sourceRoot: '.', layers: {} },
  { sourceRoot: 'apps', layers: { web: { canImport: [] } } },
  { sourceRoot: './apps/', layers: { web: { canImport: [] } } },
])(
  'placement pack on a correctly placed monorepo — sourceRoot "$sourceRoot"',
  ({ sourceRoot, layers }) => {
    it.each(PLACEMENT_RULES)('%s reports nothing', async (ruleId) => {
      const diags = await runRuleOnFixture({
        fixtureRoot: repoRoot,
        ruleId,
        sourceRoot,
        config: { layers },
      });
      expect(diags.map((d) => `${d.entity} -> ${d.expected}`)).toEqual([]);
    });
  },
);
