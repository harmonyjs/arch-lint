/**
 * @fileoverview Integration test for unit-cohesion — full check() pipeline over a fixture.
 */
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { runRuleOnFixture } from '#rules/test-support/run-fixture.js';

const fixtureRoot = fileURLToPath(new URL('../fixtures/loose-unit', import.meta.url));

describe('unit-cohesion — integration', () => {
  it('flags a unit whose files barely import each other', async () => {
    const diags = await runRuleOnFixture({
      fixtureRoot,
      ruleId: 'unit-cohesion',
      config: { units: { graph: 'graph/**' } },
    });
    expect(diags).toHaveLength(1);
    expect(diags[0]?.entity).toBe('graph');
    expect(diags[0]?.fingerprint).toBe('unit-cohesion#graph');
  });
});
