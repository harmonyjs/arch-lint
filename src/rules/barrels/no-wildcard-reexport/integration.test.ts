/**
 * @fileoverview Integration test for no-wildcard-reexport on a graph from real buildGraph.
 */
import { describe, it, expect } from 'vitest';
import { fileURLToPath } from 'node:url';
import { buildGraph } from '../../../graph/build.js';
import { loadSourceFiles } from '../../../graph/source-files.js';
import { resolveConfig } from '../../../config/resolve-defaults.js';
import { noWildcardReexport } from './index.js';
import { makeContext } from '../../test-support/make-context.js';

const fixtureRoot = fileURLToPath(
  new URL('./__tests__/fixtures/wildcard-barrel', import.meta.url),
);

describe('no-wildcard-reexport — integration', () => {
  it('flags both wildcard forms on a really built graph', async () => {
    const config = resolveConfig({
      project: { tsconfig: `${fixtureRoot}/tsconfig.json`, sourceRoot: 'src', cwd: fixtureRoot },
    });
    const graph = await buildGraph(config);
    const { project } = await loadSourceFiles(config);
    const diags = noWildcardReexport.check(
      graph,
      config,
      makeContext('no-wildcard-reexport', { severity: 'error', project }),
    );
    expect(diags).toHaveLength(2);
    const tags = diags.map((d) => d.fingerprint?.split('#').at(-1)).sort();
    expect(tags).toEqual(['*', 'bee']);
  });
});
