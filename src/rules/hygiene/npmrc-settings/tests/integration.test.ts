/**
 * @fileoverview Integration test for npmrc-settings — full check() pipeline over a fixture.
 */
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { runRuleOnFixture } from '#rules/test-support/run-fixture.js';

const fixtureRoot = fileURLToPath(new URL('../fixtures/partial-npmrc', import.meta.url));

describe('npmrc-settings — integration', () => {
  it('flags a missing required .npmrc setting', async () => {
    const diags = await runRuleOnFixture({ fixtureRoot, ruleId: 'npmrc-settings' });
    expect(diags).toHaveLength(1);
    const [diag] = diags;
    expect(diag?.entity).toBe('.npmrc');
    expect(diag?.fingerprint).toBe('save-exact');
    expect(diag?.ruleId).toBe('npmrc-settings');
  });
});
