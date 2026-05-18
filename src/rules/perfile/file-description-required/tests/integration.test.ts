/**
 * @fileoverview Integration test for file-description-required — full check() pipeline over a fixture.
 */
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { runRuleOnFixture } from '#rules/test-support/run-fixture.js';

const fixtureRoot = fileURLToPath(new URL('../fixtures/no-fileoverview', import.meta.url));

describe('file-description-required — integration', () => {
  it('flags a file with no @fileoverview', async () => {
    const diags = await runRuleOnFixture({ fixtureRoot, ruleId: 'file-description-required' });
    expect(diags).toHaveLength(1);
    expect(diags[0]?.entity).toBe('src/a.ts');
    expect(diags[0]?.fingerprint).toBe('src/a.ts');
  });
});
