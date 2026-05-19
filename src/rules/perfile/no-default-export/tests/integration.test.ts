/**
 * @fileoverview Integration test for no-default-export — full check() pipeline over a fixture.
 */
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { runRuleOnFixture } from '#rules/test-support/run-fixture.js';

const fixtureRoot = fileURLToPath(new URL('../fixtures/has-default-export', import.meta.url));

describe('no-default-export — integration', () => {
  it('flags a file with a default export', async () => {
    const diags = await runRuleOnFixture({ fixtureRoot, ruleId: 'no-default-export' });
    expect(diags).toHaveLength(1);
    expect(diags[0]?.entity).toBe('src/a.ts');
    expect(diags[0]?.fingerprint).toBe('src/a.ts');
  });
});
