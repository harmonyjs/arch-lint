/**
 * @fileoverview Unit test for runRuleOnFixture — covers the unknown-ruleId throw
 * and the happy path (full pipeline, pack union, real diagnostics).
 */
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { runRuleOnFixture } from './run-fixture.js';

const crossLayer = fileURLToPath(
  new URL('../layers/layer-boundary/fixtures/cross-layer', import.meta.url),
);

describe('runRuleOnFixture', () => {
  it('throws on an unknown ruleId', async () => {
    await expect(
      runRuleOnFixture({ fixtureRoot: crossLayer, ruleId: 'no-such-rule' }),
    ).rejects.toThrow(/unknown ruleId/);
  });

  it('runs the full pipeline and returns the rule diagnostics', async () => {
    const diags = await runRuleOnFixture({
      fixtureRoot: crossLayer,
      ruleId: 'layer-boundary',
      config: {
        packs: ['layers'],
        layers: { core: { canImport: [] }, feature: { canImport: [] } },
      },
    });
    expect(diags).toHaveLength(1);
    expect(diags[0]?.ruleId).toBe('layer-boundary');
  });
});
