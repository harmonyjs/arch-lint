/**
 * @fileoverview Integration test for lca-placement — full check() pipeline over a fixture.
 */
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { runRuleOnFixture } from '#rules/test-support/run-fixture.js';

const fixtureRoot = fileURLToPath(new URL('../fixtures/cousin-placement', import.meta.url));

describe('lca-placement — integration', () => {
  it('flags a component placed away from its consumers LCA', async () => {
    const diags = await runRuleOnFixture({ fixtureRoot, ruleId: 'lca-placement' });
    expect(diags).toHaveLength(1);
    expect(diags[0]?.ruleId).toBe('lca-placement');
    expect(diags[0]?.entity).toBe('src/App/Right/Cousin');
    expect(diags[0]?.fingerprint).toBeUndefined();
  });
});
