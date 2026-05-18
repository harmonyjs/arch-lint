/**
 * @fileoverview Integration test for no-wildcard-reexport — full check() pipeline over a fixture.
 */
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { runRuleOnFixture } from '#rules/test-support/run-fixture.js';

const fixtureRoot = fileURLToPath(new URL('../fixtures/wildcard-barrel', import.meta.url));

describe('no-wildcard-reexport — integration', () => {
  it('flags both wildcard forms on a really built graph', async () => {
    const diags = await runRuleOnFixture({ fixtureRoot, ruleId: 'no-wildcard-reexport' });
    expect(diags).toHaveLength(2);
    const tags = diags.map((d) => d.fingerprint?.split('#').at(-1)).sort();
    expect(tags).toEqual(['*', 'bee']);
  });
});
