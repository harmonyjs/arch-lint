/**
 * @fileoverview Integration test for expired-suppress — full check() pipeline over a fixture.
 */
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { runRuleOnFixture } from '#rules/test-support/run-fixture.js';

const fixtureRoot = fileURLToPath(new URL('../fixtures/stale-suppression', import.meta.url));

describe('expired-suppress — integration', () => {
  it('flags a suppression directive whose expiry date has passed', async () => {
    const diags = await runRuleOnFixture({
      fixtureRoot,
      ruleId: 'expired-suppress',
      config: { layers: { core: { canImport: [] }, feature: { canImport: [] } } },
    });
    expect(diags).toHaveLength(1);
    expect(diags[0]?.ruleId).toBe('expired-suppress');
    expect(diags[0]?.fingerprint).toBe('layer-boundary#97c5e5e0');
    // `entity` is `suppress.location.file` — a real cold-build project keys it by
    // absolute path, so it resolves to the fixture's on-disk widget.ts.
    expect(diags[0]?.entity).toBe(`${fixtureRoot}/src/feature/widget.ts`);
  });
});
