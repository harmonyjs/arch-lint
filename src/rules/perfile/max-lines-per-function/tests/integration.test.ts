/**
 * @fileoverview Integration test for max-lines-per-function — full check() pipeline over a fixture.
 */
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { runRuleOnFixture } from '#rules/test-support/run-fixture.js';

const fixtureRoot = fileURLToPath(new URL('../fixtures/long-function', import.meta.url));

describe('max-lines-per-function — integration', () => {
  it('flags an over-long function', async () => {
    const diags = await runRuleOnFixture({
      fixtureRoot,
      ruleId: 'max-lines-per-function',
      config: { rules: { 'max-lines-per-function': { max: 3 } } },
    });
    expect(diags).toHaveLength(1);
    expect(diags[0]?.entity).toBe('src/a.ts');
    expect(diags[0]?.fingerprint).toBe('src/a.ts#f');
  });
});
