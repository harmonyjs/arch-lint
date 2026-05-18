/**
 * @fileoverview Integration test for afferent-coupling — full check() pipeline over a fixture.
 */
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { runRuleOnFixture } from '#rules/test-support/run-fixture.js';

const fixtureRoot = fileURLToPath(new URL('../fixtures/wide-fan-in', import.meta.url));

describe('afferent-coupling — integration', () => {
  it('flags a unit with too many inbound units', async () => {
    const diags = await runRuleOnFixture({
      fixtureRoot,
      ruleId: 'afferent-coupling',
      config: {
        units: {
          graph: 'graph/**',
          a: 'a/**',
          b: 'b/**',
          c: 'c/**',
          d: 'd/**',
          e: 'e/**',
          f: 'f/**',
          g: 'g/**',
        },
      },
    });
    expect(diags).toHaveLength(1);
    expect(diags[0]?.entity).toBe('graph');
    expect(diags[0]?.fingerprint).toBe('afferent-coupling#graph');
  });
});
