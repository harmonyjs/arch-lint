/**
 * @fileoverview Integration test for ui-cluster-membership — full check() pipeline over a fixture.
 */
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { runRuleOnFixture } from '#rules/test-support/run-fixture.js';

const fixtureRoot = fileURLToPath(new URL('../fixtures/trigger-outside', import.meta.url));

describe('ui-cluster-membership — integration', () => {
  it('flags only the file outside the cluster on a really built graph', async () => {
    const diags = await runRuleOnFixture({
      fixtureRoot,
      ruleId: 'ui-cluster-membership',
      config: {
        rules: {
          'ui-cluster-membership': {
            triggerPackages: ['@react-aria/*'],
            mustLiveIn: 'src/App/ui',
          },
        },
      },
    });
    expect(diags).toHaveLength(1);
    expect(diags[0]?.entity).toContain('Widget.tsx');
  });
});
