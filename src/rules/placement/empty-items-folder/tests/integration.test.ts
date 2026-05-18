/**
 * @fileoverview Integration test for empty-items-folder — full check() pipeline over a fixture.
 */
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { runRuleOnFixture } from '#rules/test-support/run-fixture.js';

const fixtureRoot = fileURLToPath(new URL('../fixtures/underused-item', import.meta.url));

describe('empty-items-folder — integration', () => {
  it('flags an underused items folder', async () => {
    const diags = await runRuleOnFixture({ fixtureRoot, ruleId: 'empty-items-folder' });
    expect(diags.length).toBe(1);
    expect(diags[0]?.ruleId).toBe('empty-items-folder');
    expect(diags[0]?.entity).toBe('src/App/items/Underused');
    expect(diags[0]?.fingerprint).toBeUndefined();
  });
});
