/**
 * @fileoverview Integration test for efferent-coupling — full check() pipeline over a fixture.
 */
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { runRuleOnFixture } from '#rules/test-support/run-fixture.js';

const fixtureRoot = fileURLToPath(new URL('../fixtures/wide-fan-out', import.meta.url));

describe('efferent-coupling — integration', () => {
  it('flags a unit with too many outbound units', async () => {
    const diags = await runRuleOnFixture({
      fixtureRoot,
      ruleId: 'efferent-coupling',
      config: {
        units: {
          runner: 'runner/**',
          a: 'a/**',
          b: 'b/**',
          c: 'c/**',
          d: 'd/**',
          e: 'e/**',
        },
      },
    });
    expect(diags).toHaveLength(1);
    expect(diags[0]?.entity).toBe('runner');
    expect(diags[0]?.fingerprint).toBe('efferent-coupling#runner');
  });
});
