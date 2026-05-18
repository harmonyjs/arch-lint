/**
 * @fileoverview Integration test for instability — full check() pipeline over a fixture.
 */
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { runRuleOnFixture } from '#rules/test-support/run-fixture.js';

const fixtureRoot = fileURLToPath(new URL('../fixtures/unstable-leaf', import.meta.url));

describe('instability — integration', () => {
  it('flags a leaf unit that is too unstable', async () => {
    const diags = await runRuleOnFixture({
      fixtureRoot,
      ruleId: 'instability',
      config: {
        units: { graph: 'graph/**', report: 'report/**', runner: 'runner/**' },
        rules: { instability: { maxForLeafUnits: 0.4, leafUnits: ['graph'] } },
      },
    });
    expect(diags).toHaveLength(1);
    expect(diags[0]?.ruleId).toBe('instability');
    expect(diags[0]?.entity).toBe('graph');
    expect(diags[0]?.fingerprint).toBe('instability#graph');
    expect(diags[0]?.message).toBe('unit graph is declared a leaf but is unstable');
  });
});
