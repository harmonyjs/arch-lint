/**
 * @fileoverview Tests for file-level edge construction post barrel unwinding.
 */

import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { buildEdges } from './edges.js';
import { createResolver } from './resolve.js';
import { loadSourceFiles, moduleResolutionContextOf } from './discover-source-files.js';

let dir: string;

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'arch-lint-edges-'));
  writeFileSync(join(dir, 'tsconfig.json'), '{"compilerOptions":{"strict":true}}');
});
afterEach(() => rmSync(dir, { recursive: true, force: true }));

function write(rel: string, content: string): void {
  const full = join(dir, rel);
  mkdirSync(join(full, '..'), { recursive: true });
  writeFileSync(full, content);
}

/** Writes a minimal external package into the temp dir's node_modules. */
function writeExternal(name: string, decl: string): void {
  const pkgDir = join(dir, 'node_modules', name);
  mkdirSync(pkgDir, { recursive: true });
  writeFileSync(
    join(pkgDir, 'package.json'),
    `{"name":"${name}","version":"1.0.0","types":"index.d.ts"}`,
  );
  writeFileSync(join(pkgDir, 'index.d.ts'), decl);
}

async function buildFor(treatTypeOnlyAsEdge = true, ignore: readonly string[] = []) {
  const sources = await loadSourceFiles({
    project: { tsconfig: './tsconfig.json', sourceRoot: 'src', cwd: dir, includeOutOfRoot: false },
    resolve: { extensions: ['.ts', '.tsx'] },
    ignore,
  } as never);
  const resolver = createResolver({
    sources,
    moduleResolution: moduleResolutionContextOf(sources),
    maxResolveDepth: 32,
    cacheSize: Infinity,
  });
  return buildEdges(sources, resolver, treatTypeOnlyAsEdge);
}

describe('buildEdges — named imports', () => {
  it('builds an edge to the resolved producer file', async () => {
    write('src/inner.ts', 'export const Widget = 1;');
    write('src/app.ts', "import { Widget } from './inner.js'; export const use = Widget;");
    const { edges } = await buildFor();
    expect(edges).toContainEqual({
      consumer: 'src/app.ts',
      producer: 'src/inner.ts',
      symbol: 'Widget',
      typeOnly: false,
      syntacticPath: './inner.js',
    });
  });

  it('unwinds a barrel: edge points at the native declaration, not the barrel', async () => {
    write('src/inner.ts', 'export const Widget = 1;');
    write('src/index.ts', "export { Widget } from './inner.js';");
    write('src/app.ts', "import { Widget } from './index.js'; export const use = Widget;");
    const { edges } = await buildFor();
    const appEdge = edges.find((e) => e.consumer === 'src/app.ts');
    expect(appEdge?.producer).toBe('src/inner.ts');
    expect(appEdge?.symbol).toBe('Widget');
  });

  it('records an unresolved internal import', async () => {
    write('src/app.ts', "import { Gone } from './missing.js'; export const use = Gone;");
    const { unresolved } = await buildFor();
    expect(unresolved).toContainEqual({
      file: 'src/app.ts',
      specifier: './missing.js',
      symbol: 'Gone',
      location: { file: 'src/app.ts', line: 1, column: 1 },
      reason: 'alias-unresolved',
    });
  });

  it('ignores edges to external packages', async () => {
    writeExternal('extlib', 'export declare const useState: number;');
    write('src/app.ts', "import { useState } from 'extlib'; export const x = useState;");
    const { edges, unresolved } = await buildFor();
    expect(edges).toHaveLength(0);
    expect(unresolved).toHaveLength(0);
  });
});

describe('buildEdges — default and namespace imports', () => {
  it('builds an edge for a default import with symbol "default"', async () => {
    write('src/inner.ts', 'export default function widget() {}');
    write('src/app.ts', "import widget from './inner.js'; export const use = widget;");
    const { edges } = await buildFor();
    const e = edges.find((x) => x.consumer === 'src/app.ts');
    expect(e?.producer).toBe('src/inner.ts');
    expect(e?.symbol).toBe('default');
  });

  it('builds an edge for each statically resolvable ns.member access', async () => {
    write('src/m.ts', 'export const alpha = 1; export const beta = 2;');
    write(
      'src/app.ts',
      "import * as ns from './m.js';\nexport const a = ns.alpha;\nexport const b = ns.beta;",
    );
    const { edges } = await buildFor();
    const symbols = edges
      .filter((x) => x.consumer === 'src/app.ts')
      .map((x) => x.symbol)
      .sort();
    expect(symbols).toEqual(['alpha', 'beta']);
  });

  it('records unresolved when the whole namespace object is used as a value', async () => {
    write('src/m.ts', 'export const alpha = 1;');
    write('src/app.ts', "import * as ns from './m.js';\nexport const all = ns;");
    const { unresolved } = await buildFor();
    expect(unresolved.some((u) => u.file === 'src/app.ts' && u.reason === 'missing')).toBe(true);
  });
});

describe('buildEdges — treatTypeOnlyAsEdge', () => {
  it('keeps type-only edges when treatTypeOnlyAsEdge is true', async () => {
    write('src/types.ts', 'export interface Shape { x: number; }');
    write('src/app.ts', "import type { Shape } from './types.js'; export type Use = Shape;");
    const { edges } = await buildFor(true);
    expect(edges.some((e) => e.consumer === 'src/app.ts' && e.typeOnly)).toBe(true);
  });

  it('drops type-only edges when treatTypeOnlyAsEdge is false', async () => {
    write('src/types.ts', 'export interface Shape { x: number; }');
    write('src/app.ts', "import type { Shape } from './types.js'; export type Use = Shape;");
    const { edges } = await buildFor(false);
    expect(edges.some((e) => e.consumer === 'src/app.ts')).toBe(false);
  });

  it('keeps a value edge alongside a dropped type-only edge', async () => {
    write('src/types.ts', 'export interface Shape { x: number; }');
    write('src/values.ts', 'export const value = 1;');
    write(
      'src/app.ts',
      "import type { Shape } from './types.js';\nimport { value } from './values.js';\n" +
        'export const use = value; export type U = Shape;',
    );
    const { edges } = await buildFor(false);
    const appEdges = edges.filter((e) => e.consumer === 'src/app.ts');
    expect(appEdges).toHaveLength(1);
    expect(appEdges[0]?.producer).toBe('src/values.ts');
  });
});

describe('buildEdges — import targeting an excluded file', () => {
  it('records unresolved when the import target exists on disk but is ignored', async () => {
    write('src/excluded.ts', 'export const hidden = 1;');
    write('src/app.ts', "import { hidden } from './excluded.js'; export const u = hidden;");
    const { edges, unresolved } = await buildFor(true, ['src/excluded.ts']);
    expect(edges.some((e) => e.consumer === 'src/app.ts')).toBe(false);
    expect(unresolved).toContainEqual({
      file: 'src/app.ts',
      specifier: './excluded.js',
      symbol: 'hidden',
      location: { file: 'src/app.ts', line: 1, column: 1 },
      reason: 'alias-unresolved',
    });
  });
});
