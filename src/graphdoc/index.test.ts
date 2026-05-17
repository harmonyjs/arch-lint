/**
 * @fileoverview Tests for the graphdoc barrel — renderGraphDoc end to end.
 */
import { describe, expect, it } from 'vitest';
import type { ResolvedConfig } from '../config/types.js';
import { makeGraph } from '../rules/test-support/make-graph.js';
import { renderGraphDoc } from './index.js';

function cfg(): ResolvedConfig {
  return {
    project: { sourceRoot: 'src', cwd: '.', tsconfig: 'tsconfig.json' },
    layers: {},
    conventions: {
      privateSegment: 'private',
      sharedSegment: 'shared',
      libSegment: 'lib',
      hooksSegment: 'hooks',
      explicitClusterSegment: 'ui',
      modelSegment: 'model',
    },
  } as ResolvedConfig;
}

describe('renderGraphDoc', () => {
  it('renders a Markdown document from a graph and fileoverview map', () => {
    const graph = makeGraph({
      nodes: { 'src/a/x.ts': { isEntity: true }, 'src/b/y.ts': { isEntity: true } },
      edges: [{ consumer: 'src/a/x.ts', producer: 'src/b/y.ts', symbol: 'Y', typeOnly: false }],
    });
    const out = renderGraphDoc(graph, new Map([['src/a/x.ts', 'the x']]), cfg());
    expect(out).toContain('# Project dependency graph');
    expect(out).toContain('```mermaid');
  });
});
