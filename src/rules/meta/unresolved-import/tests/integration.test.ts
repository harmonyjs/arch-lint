/**
 * @fileoverview Integration test for unresolved-import — full check() pipeline over a fixture.
 */
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { runRuleOnFixture } from '#rules/test-support/run-fixture.js';

const fixtureRoot = fileURLToPath(new URL('../fixtures/missing-module', import.meta.url));

describe('unresolved-import — integration', () => {
  it('flags an import that resolves to nothing', async () => {
    const diags = await runRuleOnFixture({ fixtureRoot, ruleId: 'unresolved-import' });
    expect(diags).toHaveLength(1);
    expect(diags[0]?.entity).toBe('src/app.ts');
    expect(diags[0]?.fingerprint).toBe('src/app.ts#./missing.js#Gone');
  });
});
