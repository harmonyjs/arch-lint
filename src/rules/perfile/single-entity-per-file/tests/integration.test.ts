/**
 * @fileoverview Integration test for single-entity-per-file — full check() pipeline over a fixture.
 */
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { runRuleOnFixture } from '#rules/test-support/run-fixture.js';

const fixtureRoot = fileURLToPath(new URL('../fixtures/two-entities', import.meta.url));

describe('single-entity-per-file — integration', () => {
  it('flags a file declaring two entities', async () => {
    const diags = await runRuleOnFixture({ fixtureRoot, ruleId: 'single-entity-per-file' });
    expect(diags).toHaveLength(1);
    expect(diags[0]?.entity).toBe('src/a.ts');
    expect(diags[0]?.fingerprint).toBe('src/a.ts');
  });
});
