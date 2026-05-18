/**
 * @fileoverview Integration test for layer-boundary on a graph from real buildGraph.
 *
 * The fixture's layer keys are written relative to the sourceRoot — the production
 * convention, the one `units` keys also follow. Graph node ids carry the sourceRoot
 * prefix. This test is the canary for that bridge: a unit test hand-picks both the
 * id format and the key convention and can stay green while the rule is dead on a
 * real config; a really-built graph cannot.
 */
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { resolveConfig } from '#foundation/config/index.js';
import { buildGraph } from '#platform/graph/index.js';
import { layerBoundaryRule } from '#rules/layers/layer-boundary/index.js';
import { makeContext } from '#rules/test-support/make-context.js';
import { only } from '#rules/test-support/only.js';

const fixtureRoot = fileURLToPath(new URL('../fixtures/cross-layer', import.meta.url));

describe('layer-boundary — integration', () => {
  it('flags a cross-layer import on a really built graph with sourceRoot-relative keys', async () => {
    const config = resolveConfig({
      project: { tsconfig: `${fixtureRoot}/tsconfig.json`, sourceRoot: 'src', cwd: fixtureRoot },
      layers: { core: { canImport: [] }, feature: { canImport: [] } },
    });
    const graph = await buildGraph(config);
    const ctx = makeContext('layer-boundary', { severity: 'error' });
    const diag = only(layerBoundaryRule.check(graph, config, ctx));
    expect(diag.ruleId).toBe('layer-boundary');
    expect(diag.entity).toBe('src/feature/widget.ts');
    expect(diag.fingerprint).toBe('src/feature/widget.ts#src/core/base.ts');
  });
});
