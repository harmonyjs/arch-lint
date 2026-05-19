/**
 * @fileoverview Integration test for tokens-import-is-side-effect — full check() pipeline over a fixture.
 */
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { runRuleOnFixture } from '#rules/test-support/run-fixture.js';

const fixtureRoot = fileURLToPath(new URL('../fixtures/value-token-import', import.meta.url));

describe('tokens-import-is-side-effect — integration', () => {
  it('flags a value import from a tokens module', async () => {
    const diags = await runRuleOnFixture({ fixtureRoot, ruleId: 'tokens-import-is-side-effect' });
    expect(diags).toHaveLength(1);
    expect(diags[0]?.ruleId).toBe('tokens-import-is-side-effect');
    expect(diags[0]?.severity).toBe('warning');
    expect(diags[0]?.entity).toBe('src/App/App.tsx');
    expect(diags[0]?.fingerprint).toBe('src/App/App.tsx#../tokens/colors.js');
  });
});
