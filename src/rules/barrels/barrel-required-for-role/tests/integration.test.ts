/**
 * @fileoverview Integration test for barrel-required-for-role — full check() pipeline
 * over a fixture built by the real buildGraph.
 *
 * `buildGraph` only emits a `kind: 'folder'` node for a *component folder* (one that
 * owns a same-name entry `X/X.ts(x)`); a pure role folder produces no folder node and
 * the rule can never see it. The fixture therefore makes the violating folder both a
 * role folder (`lib`) and a component folder (`lib/lib.ts`) — that is what surfaces a
 * genuine role-folder verdict through the production pipeline.
 */
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { resolveConfig } from '#foundation/config/index.js';
import { buildGraph } from '#platform/graph/index.js';
import { barrelRequiredForRole } from '#rules/barrels/barrel-required-for-role/index.js';
import { makeContext } from '#rules/test-support/make-context.js';

const fixtureRoot = fileURLToPath(new URL('../fixtures/missing-barrel', import.meta.url));

describe('barrel-required-for-role — integration', () => {
  it('flags a role folder that has no barrel index', async () => {
    const config = resolveConfig({
      project: { tsconfig: `${fixtureRoot}/tsconfig.json`, sourceRoot: 'src', cwd: fixtureRoot },
    });
    const graph = await buildGraph(config);
    const diags = barrelRequiredForRole.check(
      graph,
      config,
      makeContext('barrel-required-for-role', { severity: 'error' }),
    );
    expect(diags.length).toBeGreaterThanOrEqual(1);
    expect(diags.some((d) => d.ruleId === 'barrel-required-for-role')).toBe(true);

    const diag = diags.find((d) => d.entity === 'src/App/lib');
    expect(diag).toBeDefined();
    expect(diag?.ruleId).toBe('barrel-required-for-role');
    expect(diag?.severity).toBe('error');
    expect(diag?.reason).toContain("Role folder 'lib'");
    expect(diag?.fingerprint).toBeUndefined();
  });
});
