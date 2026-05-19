/**
 * @fileoverview Integration test for complexity — full check() pipeline over a fixture.
 */
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { runRuleOnFixture } from '#rules/test-support/run-fixture.js';

const fixtureRoot = fileURLToPath(new URL('../fixtures/complex-function', import.meta.url));

describe('complexity — integration', () => {
  it('flags an over-complex function', async () => {
    const diags = await runRuleOnFixture({
      fixtureRoot,
      ruleId: 'complexity',
      config: { rules: { complexity: { max: 2 } } },
    });
    expect(diags).toHaveLength(1);
    expect(diags[0]?.entity).toBe('src/a.ts');
    expect(diags[0]?.fingerprint).toBe('src/a.ts#f');
  });
});
