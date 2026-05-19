/**
 * @fileoverview Integration test for hooks-folder-required — full check() pipeline over a fixture.
 */
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { runRuleOnFixture } from '#rules/test-support/run-fixture.js';

const fixtureRoot = fileURLToPath(new URL('../fixtures/misplaced-hook', import.meta.url));

describe('hooks-folder-required — integration', () => {
  it('flags a hook file outside a hooks folder', async () => {
    const diags = await runRuleOnFixture({ fixtureRoot, ruleId: 'hooks-folder-required' });
    expect(diags).toHaveLength(1);
    expect(diags[0]?.ruleId).toBe('hooks-folder-required');
    expect(diags[0]?.entity).toBe('src/App/use-toggle.ts');
    expect(diags[0]?.fingerprint).toBe('src/App/use-toggle.ts');
  });
});
