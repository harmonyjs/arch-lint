/**
 * @fileoverview The defining invariant of warm builds: a graph patched
 * incrementally must be byte-identical to a cold build of the same tree.
 */

import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { resolveConfig } from '../config/resolve-defaults.js';
import type { ConsumerGraph } from './types.js';
import { buildGraph } from './build.js';
import { buildIncremental } from './incremental.js';

let root: string;

function cfg() {
  return resolveConfig({ project: { tsconfig: './tsconfig.json', cwd: root, sourceRoot: 'src' } });
}

function comparable(g: ConsumerGraph): unknown {
  return {
    nodes: [...g.nodes.keys()].sort(),
    edges: [...g.edges].map((e) => `${e.consumer}->${e.producer}#${e.symbol}`).sort(),
    entityConsumersOf: [...g.entityConsumersOf.entries()]
      .map(([k, v]) => `${k}:${[...v].sort().join(',')}`)
      .sort(),
  };
}

beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), 'arch-lint-inc-'));
  writeFileSync(join(root, 'tsconfig.json'), JSON.stringify({ compilerOptions: {} }));
  mkdirSync(join(root, 'src'));
  writeFileSync(join(root, 'src', 'a.ts'), 'export const a = 1;\n');
  writeFileSync(join(root, 'src', 'b.ts'), "import { a } from './a.js';\nexport const b = a;\n");
});

afterEach(() => {
  rmSync(root, { recursive: true, force: true });
});

describe('buildIncremental', () => {
  it('a modified-file warm build equals a cold build of the new tree', async () => {
    const cold0 = await buildGraph(cfg());
    writeFileSync(join(root, 'src', 'a.ts'), 'export const a = 1;\nexport const c = 2;\n');
    const warm = await buildIncremental(
      cold0,
      { added: [], removed: [], modified: ['src/a.ts'] },
      cfg(),
    );
    const coldRef = await buildGraph(cfg());
    expect(comparable(warm)).toEqual(comparable(coldRef));
  });

  it('an added-file warm build equals a cold build of the new tree', async () => {
    const cold0 = await buildGraph(cfg());
    writeFileSync(join(root, 'src', 'd.ts'), "import { b } from './b.js';\nexport const d = b;\n");
    const warm = await buildIncremental(
      cold0,
      { added: ['src/d.ts'], removed: [], modified: [] },
      cfg(),
    );
    const coldRef = await buildGraph(cfg());
    expect(comparable(warm)).toEqual(comparable(coldRef));
  });

  it('a removed-file warm build equals a cold build of the new tree', async () => {
    const cold0 = await buildGraph(cfg());
    rmSync(join(root, 'src', 'b.ts'));
    const warm = await buildIncremental(
      cold0,
      { added: [], removed: ['src/b.ts'], modified: [] },
      cfg(),
    );
    const coldRef = await buildGraph(cfg());
    expect(comparable(warm)).toEqual(comparable(coldRef));
  });

  it('produces a frozen graph', async () => {
    const cold0 = await buildGraph(cfg());
    const warm = await buildIncremental(cold0, { added: [], removed: [], modified: [] }, cfg());
    expect(Object.isFrozen(warm)).toBe(true);
  });
});
