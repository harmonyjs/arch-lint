/**
 * @fileoverview Integration tests for buildGraph cold build over a real directory.
 */

import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { ResolvedConfig } from '#config/types.js';
import { buildGraph } from './build.js';

let dir: string;

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'arch-lint-build-'));
  writeFileSync(join(dir, 'tsconfig.json'), '{"compilerOptions":{"strict":true}}');
});
afterEach(() => rmSync(dir, { recursive: true, force: true }));

function write(rel: string, content: string): void {
  const full = join(dir, rel);
  mkdirSync(join(full, '..'), { recursive: true });
  writeFileSync(full, content);
}

function makeConfig(): ResolvedConfig {
  return {
    project: { tsconfig: './tsconfig.json', sourceRoot: 'src', cwd: dir, includeOutOfRoot: false },
    conventions: {
      privateSegment: 'slots',
      sharedSegment: 'items',
      libSegment: 'lib',
      hooksSegment: 'hooks',
      explicitClusterSegment: 'ui',
      modelSegment: 'model',
      indexFiles: ['index.ts', 'index.tsx'],
    },
    packs: ['layers'],
    explicitPlacement: [],
    resolve: {
      treatTypeOnlyAsEdge: true,
      maxResolveDepth: 32,
      cacheSize: Infinity,
      extensions: ['.ts', '.tsx'],
    },
    layers: {},
    rules: {},
    perFileRules: {},
    ignore: ['**/*.test.ts'],
    baseline: {
      file: '.arch-lint-baseline.json',
      sortRecords: 'alphabetical',
      missingBehavior: 'ignore',
    },
    suppress: {
      marker: '@arch-decision',
      minReasonLength: 12,
      expirySupport: true,
      scanLocations: ['leading-comment'],
      maxDistanceLines: 5,
    },
    report: {
      cli: {
        color: 'never',
        showSuggestions: true,
        showConsumers: true,
        hyperlinks: 'never',
        foldLongLists: true,
      },
    },
    runMode: {
      watch: { rules: 'all', debounceMs: 200, clearOnRerun: true },
      preCommit: { rules: 'all', maxDurationMs: 5000, failOnViolations: true },
      ci: { failOnViolations: true },
    },
    plugins: [],
  };
}

describe('buildGraph', () => {
  it('builds a frozen graph end-to-end with edges and entity projection', async () => {
    write('src/Widget/Widget.tsx', 'export const Widget = 1;');
    write('src/Widget/index.ts', "export { Widget } from './Widget.js';");
    write('src/app.ts', "import { Widget } from './Widget/index.js'; export const u = Widget;");
    const graph = await buildGraph(makeConfig());
    expect(graph.nodes.has('src/Widget')).toBe(true);
    expect(graph.nodes.get('src/Widget')?.kind).toBe('folder');
    const appEdge = graph.edges.find((e) => e.consumer === 'src/app.ts');
    expect(appEdge?.producer).toBe('src/Widget/Widget.tsx');
    expect(graph.entityConsumersOf.get('src/Widget')).toEqual(['src/app.ts']);
    expect(Object.isFrozen(graph)).toBe(true);
  });

  it('excludes ignored files from nodes and edges', async () => {
    write('src/keep.ts', 'export const keep = 1;');
    write('src/keep.test.ts', "import { keep } from './keep.js'; export const t = keep;");
    const graph = await buildGraph(makeConfig());
    expect(graph.nodes.has('src/keep.test.ts')).toBe(false);
    expect(graph.edges.some((e) => e.consumer === 'src/keep.test.ts')).toBe(false);
  });

  it('reports an unresolved internal import in graph.unresolved', async () => {
    write('src/app.ts', "import { Gone } from './missing.js'; export const u = Gone;");
    const graph = await buildGraph(makeConfig());
    expect(graph.unresolved.some((u) => u.file === 'src/app.ts' && u.symbol === 'Gone')).toBe(true);
  });
});
