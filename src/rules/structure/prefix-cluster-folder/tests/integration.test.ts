/**
 * @fileoverview Integration test for prefix-cluster-folder — full check() pipeline over a fixture.
 */
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { runRuleOnFixture } from '#rules/test-support/run-fixture.js';

const fixtureRoot = fileURLToPath(new URL('../fixtures/prefix-cluster', import.meta.url));

describe('prefix-cluster-folder — integration', () => {
  it('flags a folder whose files share a name prefix', async () => {
    const diags = await runRuleOnFixture({ fixtureRoot, ruleId: 'prefix-cluster-folder' });
    expect(diags).toHaveLength(1);
    expect(diags[0]?.ruleId).toBe('prefix-cluster-folder');
    expect(diags[0]?.entity).toBe('src/auth');
    expect(diags[0]?.fingerprint).toBe('prefix-cluster-folder#src/auth#auth');
  });
});
