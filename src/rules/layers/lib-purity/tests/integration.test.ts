/**
 * @fileoverview Integration test for lib-purity — full check() pipeline over a fixture.
 */
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { runRuleOnFixture } from '#rules/test-support/run-fixture.js';

const fixtureRoot = fileURLToPath(new URL('../fixtures/forbidden-import', import.meta.url));

describe('lib-purity — integration', () => {
  it('flags a lib file importing a forbidden module', async () => {
    const diags = await runRuleOnFixture({
      fixtureRoot,
      ruleId: 'lib-purity',
      config: { rules: { 'lib-purity': { forbiddenImports: ['react'] } } },
    });
    expect(diags).toHaveLength(1);
    expect(diags[0]?.entity).toBe('src/lib/util.ts');
    expect(diags[0]?.fingerprint).toBe('src/lib/util.ts#react#useState');
  });
});
