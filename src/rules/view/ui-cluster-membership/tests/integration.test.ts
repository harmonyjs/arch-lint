/**
 * @fileoverview Integration test for ui-cluster-membership on a graph from real buildGraph.
 */

import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { resolveConfig } from '#config/index.js';
import { loadSourceFiles } from '#graph/discover-source-files.js';
import { buildGraph } from '#graph/index.js';
import { makeContext } from '#rules/test-support/make-context.js';
import {
  type UiClusterMembershipOptions,
  uiClusterMembership,
} from '#rules/view/ui-cluster-membership/index.js';

const fixtureRoot = fileURLToPath(new URL('../fixtures/trigger-outside', import.meta.url));

describe('ui-cluster-membership — integration', () => {
  it('flags only the file outside the cluster on a really built graph', async () => {
    const config = resolveConfig({
      project: { tsconfig: `${fixtureRoot}/tsconfig.json`, sourceRoot: 'src', cwd: fixtureRoot },
    });
    const graph = await buildGraph(config);
    const { project } = await loadSourceFiles(config);
    const diags = uiClusterMembership.check(
      graph,
      config,
      makeContext<UiClusterMembershipOptions>('ui-cluster-membership', {
        severity: 'error',
        options: { triggerPackages: ['@react-aria/*'], mustLiveIn: 'src/App/ui' },
        project,
      }),
    );
    expect(diags).toHaveLength(1);
    expect(diags[0]?.entity).toContain('Widget.tsx');
  });
});
