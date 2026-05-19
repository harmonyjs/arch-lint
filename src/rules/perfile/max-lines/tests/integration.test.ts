/**
 * @fileoverview Integration test for max-lines — full check() pipeline over a fixture.
 */
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { runRuleOnFixture } from '#rules/test-support/run-fixture.js';

const fixtureRoot = fileURLToPath(new URL('../fixtures/long-file', import.meta.url));

describe('max-lines — integration', () => {
  it('flags an over-long file', async () => {
    const diags = await runRuleOnFixture({
      fixtureRoot,
      ruleId: 'max-lines',
      config: { rules: { 'max-lines': { max: 2 } } },
    });
    expect(diags).toHaveLength(1);
    expect(diags[0]?.entity).toBe('src/a.ts');
    expect(diags[0]?.fingerprint).toBe('src/a.ts');
  });
});
