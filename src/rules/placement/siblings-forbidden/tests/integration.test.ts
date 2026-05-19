/**
 * @fileoverview Integration test for siblings-forbidden — full check() pipeline over a fixture.
 */
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { runRuleOnFixture } from '#rules/test-support/run-fixture.js';

const fixtureRoot = fileURLToPath(new URL('../fixtures/sideways-import', import.meta.url));

describe('siblings-forbidden — integration', () => {
  it('flags a sideways import between sibling components', async () => {
    const diags = await runRuleOnFixture({ fixtureRoot, ruleId: 'siblings-forbidden' });
    expect(diags).toHaveLength(1);
    expect(diags[0]?.ruleId).toBe('siblings-forbidden');
    // The rule flags the imported sibling (Header), not the importer (Footer).
    expect(diags[0]?.entity).toBe('src/App/Header');
    expect(diags[0]?.fingerprint).toBeUndefined();
  });
});
