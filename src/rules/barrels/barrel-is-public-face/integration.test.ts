/**
 * @fileoverview Integration test for barrel-is-public-face on a graph from real buildGraph.
 */
import { describe, it, expect } from 'vitest';
import { fileURLToPath } from 'node:url';
import { Project } from 'ts-morph';
import { buildGraph } from '../../../graph/build.js';
import { resolveConfig } from '../../../config/resolve-defaults.js';
import { barrelIsPublicFace, type BarrelIsPublicFaceOptions } from './index.js';
import { makeContext } from '../../test-support/make-context.js';

const fixtureRoot = fileURLToPath(
  new URL('./__tests__/fixtures/bypass-import', import.meta.url),
);

function ctx() {
  return makeContext<BarrelIsPublicFaceOptions>('barrel-is-public-face', {
    severity: 'error',
    options: { enforceForSegments: 'all', allowExplicitIndex: false, allowSiblingImports: true },
    project: new Project({ useInMemoryFileSystem: true }),
  });
}

describe('barrel-is-public-face — integration', () => {
  it('flags a barrel bypass on a really built graph', async () => {
    const config = resolveConfig({
      project: { tsconfig: `${fixtureRoot}/tsconfig.json`, sourceRoot: 'src', cwd: fixtureRoot },
    });
    const graph = await buildGraph(config);
    const diags = barrelIsPublicFace.check(graph, config, ctx());
    expect(diags.length).toBeGreaterThanOrEqual(1);
    expect(
      diags.some(
        (d) => d.ruleId === 'barrel-is-public-face' && d.message.includes('bypassing the barrel'),
      ),
    ).toBe(true);
  });
});
