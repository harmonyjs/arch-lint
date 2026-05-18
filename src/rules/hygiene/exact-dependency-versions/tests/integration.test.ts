/**
 * @fileoverview Integration test for exact-dependency-versions — full check() pipeline over a fixture.
 */
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { runRuleOnFixture } from '#rules/test-support/run-fixture.js';

const fixtureRoot = fileURLToPath(new URL('../fixtures/range-dependency', import.meta.url));

describe('exact-dependency-versions — integration', () => {
  it('flags a range-pinned dependency', async () => {
    const diags = await runRuleOnFixture({ fixtureRoot, ruleId: 'exact-dependency-versions' });
    expect(diags).toHaveLength(1);
    expect(diags[0]?.entity).toBe('package.json');
    expect(diags[0]?.fingerprint).toBe('dependencies#zod');
  });
});
