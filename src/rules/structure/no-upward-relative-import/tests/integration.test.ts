/**
 * @fileoverview Integration test for no-upward-relative-import — full check() pipeline over a fixture.
 */
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { runRuleOnFixture } from '#rules/test-support/run-fixture.js';

const fixtureRoot = fileURLToPath(new URL('../fixtures/upward-import', import.meta.url));

describe('no-upward-relative-import — integration', () => {
  it('flags an upward relative import', async () => {
    const diags = await runRuleOnFixture({ fixtureRoot, ruleId: 'no-upward-relative-import' });
    expect(diags).toHaveLength(1);
    expect(diags[0]?.entity).toBe('src/a/b.ts');
    expect(diags[0]?.fingerprint).toBe('no-upward-relative-import#src/a/b.ts#../shared.js');
  });
});
