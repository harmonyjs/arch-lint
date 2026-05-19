/**
 * @fileoverview Integration test for package-engines — full check() pipeline over a fixture.
 */
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { runRuleOnFixture } from '#rules/test-support/run-fixture.js';

const fixtureRoot = fileURLToPath(new URL('../fixtures/missing-engine', import.meta.url));

describe('package-engines — integration', () => {
  it('flags a package.json missing a required engine', async () => {
    const diags = await runRuleOnFixture({ fixtureRoot, ruleId: 'package-engines' });
    // Fixture declares engines.node but not engines.npm; default requiredKeys
    // are ['node', 'npm'], so exactly one diagnostic — for the missing `npm`.
    expect(diags).toHaveLength(1);
    const [diag] = diags;
    expect(diag).toMatchObject({
      ruleId: 'package-engines',
      severity: 'error',
      entity: 'package.json',
      fingerprint: 'npm',
      message: 'engines.npm must be declared',
    });
  });
});
