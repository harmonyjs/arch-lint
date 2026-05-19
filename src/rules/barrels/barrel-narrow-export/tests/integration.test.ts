/**
 * @fileoverview Integration test for barrel-narrow-export — full check() pipeline over a fixture.
 */
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { runRuleOnFixture } from '#rules/test-support/run-fixture.js';

const fixtureRoot = fileURLToPath(new URL('../fixtures/narrow-barrel', import.meta.url));

describe('barrel-narrow-export — integration', () => {
  it('flags a barrel that re-exports more than the folder public face', async () => {
    const diags = await runRuleOnFixture({ fixtureRoot, ruleId: 'barrel-narrow-export' });
    expect(diags).toHaveLength(1);
    expect(diags[0]?.ruleId).toBe('barrel-narrow-export');
    expect(diags[0]?.entity).toBe('src/App/Card');
    expect(diags[0]?.fingerprint).toBeUndefined();
  });
});
