/**
 * @fileoverview Tests for ConsumerGraph assembly and freezing.
 */

import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { ConventionsConfig } from '#foundation/config/types.js';
import { freezeGraph } from './consumer-graph.js';
import { loadSourceFiles } from './discover-source-files.js';
import type { Edge, Node } from './types.js';

let dir: string;

const conventions: ConventionsConfig = {
  privateSegment: 'slots',
  sharedSegment: 'items',
  libSegment: 'lib',
  hooksSegment: 'hooks',
  explicitClusterSegment: 'ui',
  modelSegment: 'model',
  indexFiles: ['index.ts', 'index.tsx'],
};

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'arch-lint-cg-'));
  writeFileSync(join(dir, 'tsconfig.json'), '{"compilerOptions":{"strict":true}}');
});
afterEach(() => rmSync(dir, { recursive: true, force: true }));

function write(rel: string, content: string): void {
  const full = join(dir, rel);
  mkdirSync(join(full, '..'), { recursive: true });
  writeFileSync(full, content);
}

async function loadSet() {
  return loadSourceFiles({
    project: { tsconfig: './tsconfig.json', sourceRoot: 'src', cwd: dir, includeOutOfRoot: false },
    resolve: { extensions: ['.ts', '.tsx'] },
    ignore: [],
  } as never);
}

describe('freezeGraph', () => {
  it('assembles a frozen graph with indices and entity projection', async () => {
    write('src/Widget/Widget.tsx', 'export const Widget = 1;');
    write('src/app.ts', "import { Widget } from './Widget/index.js'; export const u = Widget;");
    const sources = await loadSet();
    const nodes = new Map<string, Node>([
      ['src/app.ts', { id: 'src/app.ts', kind: 'file', isEntity: true, placementMode: 'reactive' }],
    ]);
    const edges: Edge[] = [
      {
        consumer: 'src/app.ts',
        producer: 'src/Widget/Widget.tsx',
        symbol: 'Widget',
        typeOnly: false,
      },
    ];
    const graph = freezeGraph({
      nodes,
      edges,
      unresolved: [],
      entityCtx: { sources, conventions },
      rootDir: join(dir, 'src'),
    });
    expect(graph.edges).toHaveLength(1);
    expect(graph.consumersOf.get('src/Widget/Widget.tsx')?.[0]?.consumer).toBe('src/app.ts');
    expect(graph.producersOf.get('src/app.ts')?.[0]?.producer).toBe('src/Widget/Widget.tsx');
    expect(graph.entityConsumersOf.get('src/Widget')).toEqual(['src/app.ts']);
    expect(graph.builtAt).toBeInstanceOf(Date);
    expect(graph.rootDir).toBe(join(dir, 'src'));
  });

  it('freezes the edges array against mutation', async () => {
    write('src/x.ts', 'export const x = 1;');
    const sources = await loadSet();
    const graph = freezeGraph({
      nodes: new Map(),
      edges: [],
      unresolved: [],
      entityCtx: { sources, conventions },
      rootDir: join(dir, 'src'),
    });
    expect(Object.isFrozen(graph.edges)).toBe(true);
    expect(Object.isFrozen(graph)).toBe(true);
  });
});
