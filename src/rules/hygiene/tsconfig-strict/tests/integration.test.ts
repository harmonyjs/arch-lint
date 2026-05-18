/**
 * @fileoverview Integration test for tsconfig-strict — full check() pipeline over a fixture.
 */
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { runRuleOnFixture } from '#rules/test-support/run-fixture.js';

const fixtureRoot = fileURLToPath(new URL('../fixtures/loose-tsconfig', import.meta.url));

describe('tsconfig-strict — integration', () => {
  it('flags a tsconfig with strict mode off', async () => {
    const diags = await runRuleOnFixture({
      fixtureRoot,
      ruleId: 'tsconfig-strict',
      // `recommended` keeps the required set to `strict` alone; `severity` is set
      // explicitly because a rule-options object without it resolves to 'warning'.
      config: { rules: { 'tsconfig-strict': { preset: 'recommended', severity: 'error' } } },
    });
    expect(diags.length).toBeGreaterThanOrEqual(1);
    expect(diags.some((d) => d.entity === 'tsconfig.json')).toBe(true);

    // recommended preset requires exactly one flag — `strict` — so the loose
    // fixture (`strict: false`) yields a single diagnostic fingerprinted on it.
    expect(diags).toHaveLength(1);
    const diag = diags[0];
    expect(diag?.ruleId).toBe('tsconfig-strict');
    expect(diag?.severity).toBe('error');
    expect(diag?.entity).toBe('tsconfig.json');
    expect(diag?.fingerprint).toBe('strict');
    expect(diag?.message).toBe('compilerOptions.strict must be enabled');
  });
});
