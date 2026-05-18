/**
 * @fileoverview Integration test for barrel-is-public-face — full check() pipeline over a fixture.
 */
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { runRuleOnFixture } from '#rules/test-support/run-fixture.js';

const fixtureRoot = fileURLToPath(new URL('../fixtures/bypass-import', import.meta.url));

describe('barrel-is-public-face — integration', () => {
  it('flags a barrel bypass on a really built graph', async () => {
    const diags = await runRuleOnFixture({
      fixtureRoot,
      ruleId: 'barrel-is-public-face',
      config: {
        rules: {
          'barrel-is-public-face': {
            enforceForSegments: 'all',
            allowExplicitIndex: false,
            allowSiblingImports: true,
          },
        },
      },
    });
    expect(diags).toHaveLength(1);
    expect(diags[0]?.entity).toBe('src/App/main.tsx');
    expect(diags[0]?.fingerprint).toBe('src/App/main.tsx#src/App/Card/internal.ts');
    expect(diags[0]?.message).toContain('bypassing the barrel');
  });
});
