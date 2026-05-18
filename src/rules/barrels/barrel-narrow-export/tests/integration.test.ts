/**
 * @fileoverview Integration test for barrel-narrow-export — full check() pipeline over a fixture.
 */

import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { resolveConfig } from '#foundation/config/index.js';
import { loadSourceFiles } from '#platform/graph/discover-source-files.js';
import { buildGraph } from '#platform/graph/index.js';
import { barrelNarrowExport } from '#rules/barrels/barrel-narrow-export/index.js';
import { makeContext } from '#rules/test-support/make-context.js';

const fixtureRoot = fileURLToPath(new URL('../fixtures/narrow-barrel', import.meta.url));

describe('barrel-narrow-export — integration', () => {
  it('flags a barrel that re-exports more than the folder public face', async () => {
    const config = resolveConfig({
      project: { tsconfig: `${fixtureRoot}/tsconfig.json`, sourceRoot: 'src', cwd: fixtureRoot },
    });
    const graph = await buildGraph(config);
    const { project } = await loadSourceFiles(config);
    const diags = barrelNarrowExport.check(
      graph,
      config,
      makeContext('barrel-narrow-export', { severity: 'warning', project }),
    );
    expect(diags.length).toBeGreaterThanOrEqual(1);
    expect(diags.some((d) => d.ruleId === 'barrel-narrow-export')).toBe(true);
    expect(diags[0]?.entity).toBe('src/App/Card');
    expect(diags[0]?.fingerprint).toBeUndefined();
  });
});
