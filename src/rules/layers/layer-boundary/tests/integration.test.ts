/**
 * @fileoverview Integration test for layer-boundary — full check() pipeline over a fixture.
 *
 * The fixture's layer keys are written relative to the sourceRoot — the production
 * convention. Graph node ids carry the sourceRoot prefix. This test is the canary
 * for that bridge: a unit test hand-picks both the id format and the key convention
 * and can stay green while the rule is dead on a real config; a really-built graph
 * cannot.
 */
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { runRuleOnFixture } from '#rules/test-support/run-fixture.js';

const fixtureRoot = fileURLToPath(new URL('../fixtures/cross-layer', import.meta.url));

describe('layer-boundary — integration', () => {
  it('flags a cross-layer import on a really built graph', async () => {
    const diags = await runRuleOnFixture({
      fixtureRoot,
      ruleId: 'layer-boundary',
      config: { layers: { core: { canImport: [] }, feature: { canImport: [] } } },
    });
    expect(diags).toHaveLength(1);
    expect(diags[0]?.entity).toBe('src/feature/widget.ts');
    expect(diags[0]?.fingerprint).toBe('src/feature/widget.ts#src/core/base.ts');
  });
});
