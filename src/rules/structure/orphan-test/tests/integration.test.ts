/**
 * @fileoverview Integration test for orphan-test — full check() pipeline over a fixture.
 */
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { runRuleOnFixture } from '#rules/test-support/run-fixture.js';

const fixtureRoot = fileURLToPath(new URL('../fixtures/orphan-test-file', import.meta.url));

describe('orphan-test — integration', () => {
  it('flags a test file with no sibling source', async () => {
    const diags = await runRuleOnFixture({ fixtureRoot, ruleId: 'orphan-test' });
    expect(diags).toHaveLength(1);
    expect(diags[0]?.entity).toBe('src/a/widget.test.ts');
    expect(diags[0]?.fingerprint).toBe('orphan-test#src/a/widget.test.ts');
  });
});
