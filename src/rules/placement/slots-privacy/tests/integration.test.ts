/**
 * @fileoverview Integration test for slots-privacy — full check() pipeline over a fixture.
 */
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { runRuleOnFixture } from '#rules/test-support/run-fixture.js';

const fixtureRoot = fileURLToPath(new URL('../fixtures/leaked-slot', import.meta.url));

describe('slots-privacy — integration', () => {
  it('flags a slot imported from outside its owning component', async () => {
    const diags = await runRuleOnFixture({ fixtureRoot, ruleId: 'slots-privacy' });
    expect(diags).toHaveLength(1);
    expect(diags[0]?.ruleId).toBe('slots-privacy');
    expect(diags[0]?.entity).toBe('src/App/Header/slots/Leaked');
  });
});
