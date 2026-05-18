/**
 * @fileoverview Integration test for max-optional-params — full check() pipeline over a fixture.
 */
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { runRuleOnFixture } from '#rules/test-support/run-fixture.js';

const fixtureRoot = fileURLToPath(new URL('../fixtures/many-optional-params', import.meta.url));

describe('max-optional-params — integration', () => {
  it('flags a function with too many optional params', async () => {
    const diags = await runRuleOnFixture({ fixtureRoot, ruleId: 'max-optional-params' });
    expect(diags).toHaveLength(1);
    expect(diags[0]?.entity).toBe('src/a.ts');
    expect(diags[0]?.fingerprint).toBe('src/a.ts#f');
  });
});
