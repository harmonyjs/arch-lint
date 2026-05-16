/**
 * @fileoverview Integration test for ui-cluster-membership on a graph from real buildGraph.
 */
import { describe, it, expect } from 'vitest';
import { fileURLToPath } from 'node:url';
import { buildGraph } from '../../graph/build.js';
import { loadSourceFiles } from '../../graph/source-files.js';
import { resolveConfig } from '../../config/resolve-defaults.js';
import { uiClusterMembership, type UiClusterMembershipOptions } from './index.js';
import { makeContext } from '../test-support/make-context.js';

const fixtureRoot = fileURLToPath(
  new URL('./__tests__/fixtures/trigger-outside', import.meta.url),
);

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
