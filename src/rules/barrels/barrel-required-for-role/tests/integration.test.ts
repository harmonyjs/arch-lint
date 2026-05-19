/**
 * @fileoverview Integration test for barrel-required-for-role — full check() pipeline over a fixture.
 *
 * `buildGraph` only emits a `kind: 'folder'` node for a component folder (one owning a
 * same-name entry `X/X.ts(x)`); a pure role folder produces no folder node. The fixture
 * makes the violating folder both a role folder (`lib`) and a component folder
 * (`lib/lib.ts`) so a genuine role-folder verdict surfaces through the real pipeline.
 */
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { runRuleOnFixture } from '#rules/test-support/run-fixture.js';

const fixtureRoot = fileURLToPath(new URL('../fixtures/missing-barrel', import.meta.url));

describe('barrel-required-for-role — integration', () => {
  it('flags a role folder that has no barrel index', async () => {
    const diags = await runRuleOnFixture({ fixtureRoot, ruleId: 'barrel-required-for-role' });
    expect(diags).toHaveLength(1);
    expect(diags[0]?.entity).toBe('src/App/lib');
    expect(diags[0]?.reason).toContain("Role folder 'lib'");
    expect(diags[0]?.fingerprint).toBeUndefined();
  });
});
