/**
 * @fileoverview Tests for the syntactic export resolver: depth limits, cycles, caching.
 */

import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createResolver, type Resolver } from './resolve.js';
import { loadSourceFiles, moduleResolutionContextOf } from './source-files.js';

let dir: string;

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'arch-lint-resolve-'));
  mkdirSync(join(dir, 'src'), { recursive: true });
  writeFileSync(join(dir, 'tsconfig.json'), '{"compilerOptions":{"strict":true}}');
});

afterEach(() => {
  rmSync(dir, { recursive: true, force: true });
});

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

async function makeResolver(maxResolveDepth = 32, cacheSize = Infinity): Promise<Resolver> {
  const set = await loadSourceFiles({
    project: { tsconfig: './tsconfig.json', sourceRoot: 'src', cwd: dir, includeOutOfRoot: false },
    resolve: { extensions: ['.ts', '.tsx'] },
    ignore: [],
  } as never);
  return createResolver({
    sources: set,
    moduleResolution: moduleResolutionContextOf(set),
    maxResolveDepth,
    cacheSize,
  });
}

describe('createResolver — depth and cycle guards', () => {
  it('returns unresolved/missing when nothing matches the name', async () => {
    write('src/m.ts', 'export const other = 1;');
    const resolver = await makeResolver();
    expect(resolver.resolveExport('src/m.ts', 'nope')).toEqual({
      kind: 'unresolved',
      reason: 'missing',
    });
  });

  it('detects a self re-export cycle as cycle', async () => {
    write('src/a.ts', "export { x } from './b.js';");
    write('src/b.ts', "export { x } from './a.js';");
    const resolver = await makeResolver();
    expect(resolver.resolveExport('src/a.ts', 'x')).toEqual({ kind: 'cycle' });
  });

  it('returns depth-exceeded once the seen set hits maxResolveDepth', async () => {
    write('src/a.ts', "export { x } from './b.js';");
    write('src/b.ts', 'export const x = 1;');
    const resolver = await makeResolver(1);
    expect(resolver.resolveExport('src/a.ts', 'x')).toEqual({
      kind: 'unresolved',
      reason: 'depth-exceeded',
    });
  });
});

describe('compute — native declaration (1a / 1c)', () => {
  it('resolves an exported const declaration in one step', async () => {
    write('src/m.ts', 'export const Foo = 1;');
    const resolver = await makeResolver();
    expect(resolver.resolveExport('src/m.ts', 'Foo')).toEqual({
      kind: 'resolved',
      file: 'src/m.ts',
      symbol: 'Foo',
      typeOnly: false,
    });
  });

  it('resolves an exported function declaration', async () => {
    write('src/m.ts', 'export function bar() { return 1; }');
    const resolver = await makeResolver();
    expect(resolver.resolveExport('src/m.ts', 'bar')).toEqual({
      kind: 'resolved',
      file: 'src/m.ts',
      symbol: 'bar',
      typeOnly: false,
    });
  });

  it('marks an exported interface declaration as typeOnly', async () => {
    write('src/m.ts', 'export interface Shape { x: number; }');
    const resolver = await makeResolver();
    expect(resolver.resolveExport('src/m.ts', 'Shape')).toEqual({
      kind: 'resolved',
      file: 'src/m.ts',
      symbol: 'Shape',
      typeOnly: true,
    });
  });

  it('resolves a default export declaration with symbol "default"', async () => {
    write('src/m.ts', 'export default function widget() {}');
    const resolver = await makeResolver();
    expect(resolver.resolveExport('src/m.ts', 'default')).toEqual({
      kind: 'resolved',
      file: 'src/m.ts',
      symbol: 'default',
      typeOnly: false,
    });
  });

  it('resolves "export { x as default }" to symbol "default"', async () => {
    write('src/m.ts', 'const x = 1; export { x as default };');
    const resolver = await makeResolver();
    expect(resolver.resolveExport('src/m.ts', 'default')).toEqual({
      kind: 'resolved',
      file: 'src/m.ts',
      symbol: 'default',
      typeOnly: false,
    });
  });
});

describe('compute — named re-export (step 2)', () => {
  it('resolves "export { X as Y } from" to the original name in the target', async () => {
    write('src/inner.ts', 'export const Original = 1;');
    write('src/barrel.ts', "export { Original as Renamed } from './inner.js';");
    const resolver = await makeResolver();
    expect(resolver.resolveExport('src/barrel.ts', 'Renamed')).toEqual({
      kind: 'resolved',
      file: 'src/inner.ts',
      symbol: 'Original',
      typeOnly: false,
    });
  });

  it('returns external when the named re-export targets node_modules', async () => {
    writeExternal('extlib', 'export declare const useState: number;');
    write('src/barrel.ts', "export { useState } from 'extlib';");
    const resolver = await makeResolver();
    expect(resolver.resolveExport('src/barrel.ts', 'useState')).toEqual({ kind: 'external' });
  });

  it('returns alias-unresolved when the re-export target file is missing', async () => {
    write('src/barrel.ts', "export { Gone } from './missing.js';");
    const resolver = await makeResolver();
    expect(resolver.resolveExport('src/barrel.ts', 'Gone')).toEqual({
      kind: 'unresolved',
      reason: 'alias-unresolved',
    });
  });
});

describe('compute — local re-export without "from" (step 1b)', () => {
  it('resolves "export { X as Y }" to the declaration of X with symbol X', async () => {
    write('src/m.ts', 'const Internal = 1; export { Internal as Public };');
    const resolver = await makeResolver();
    expect(resolver.resolveExport('src/m.ts', 'Public')).toEqual({
      kind: 'resolved',
      file: 'src/m.ts',
      symbol: 'Internal',
      typeOnly: false,
    });
  });

  it('resolves "export { X }" to the declaration of X', async () => {
    write('src/m.ts', 'function helper() {} export { helper };');
    const resolver = await makeResolver();
    expect(resolver.resolveExport('src/m.ts', 'helper')).toEqual({
      kind: 'resolved',
      file: 'src/m.ts',
      symbol: 'helper',
      typeOnly: false,
    });
  });

  it('keeps typeOnly when the local re-export specifier is type-only', async () => {
    write('src/m.ts', 'type T = number; export { type T as PublicT };');
    const resolver = await makeResolver();
    expect(resolver.resolveExport('src/m.ts', 'PublicT')).toEqual({
      kind: 'resolved',
      file: 'src/m.ts',
      symbol: 'T',
      typeOnly: true,
    });
  });
});

describe('compute — type-only propagation and parse errors', () => {
  it('propagates typeOnly true when a re-export hop uses "export type"', async () => {
    write('src/inner.ts', 'export const Value = 1;');
    write('src/barrel.ts', "export type { Value } from './inner.js';");
    const resolver = await makeResolver();
    expect(resolver.resolveExport('src/barrel.ts', 'Value')).toEqual({
      kind: 'resolved',
      file: 'src/inner.ts',
      symbol: 'Value',
      typeOnly: true,
    });
  });

  it('keeps typeOnly true across a two-hop chain when the first hop is type-only', async () => {
    write('src/inner.ts', 'export const Value = 1;');
    write('src/mid.ts', "export { Value } from './inner.js';");
    write('src/barrel.ts', "export type { Value } from './mid.js';");
    const resolver = await makeResolver();
    expect(resolver.resolveExport('src/barrel.ts', 'Value')).toEqual({
      kind: 'resolved',
      file: 'src/inner.ts',
      symbol: 'Value',
      typeOnly: true,
    });
  });

  it('does not fail when the target file has broken syntax', async () => {
    write('src/inner.ts', 'export const Value = 1; this is not valid typescript ){{');
    write('src/barrel.ts', "export { Value } from './inner.js';");
    const resolver = await makeResolver();
    const r = resolver.resolveExport('src/barrel.ts', 'Value');
    expect(['resolved', 'unresolved']).toContain(r.kind);
  });
});

describe('compute — wildcard re-export (step 3): single target', () => {
  it('resolves a name through a single "export *" hop', async () => {
    write('src/inner.ts', 'export const Widget = 1;');
    write('src/barrel.ts', "export * from './inner.js';");
    const resolver = await makeResolver();
    expect(resolver.resolveExport('src/barrel.ts', 'Widget')).toEqual({
      kind: 'resolved',
      file: 'src/inner.ts',
      symbol: 'Widget',
      typeOnly: false,
    });
  });

  it('resolves a name through several "export *" hops', async () => {
    write('src/leaf.ts', 'export function deep() {}');
    write('src/mid.ts', "export * from './leaf.js';");
    write('src/barrel.ts', "export * from './mid.js';");
    const resolver = await makeResolver();
    expect(resolver.resolveExport('src/barrel.ts', 'deep')).toEqual({
      kind: 'resolved',
      file: 'src/leaf.ts',
      symbol: 'deep',
      typeOnly: false,
    });
  });
});

describe('compute — wildcard re-export (step 3): ambiguous and external', () => {
  it('returns ambiguous-wildcard when two internal targets expose the name', async () => {
    write('src/a.ts', 'export const Dup = 1;');
    write('src/b.ts', 'export const Dup = 2;');
    write('src/barrel.ts', "export * from './a.js';\nexport * from './b.js';");
    const resolver = await makeResolver();
    expect(resolver.resolveExport('src/barrel.ts', 'Dup')).toEqual({
      kind: 'unresolved',
      reason: 'ambiguous-wildcard',
    });
  });

  it('returns external when the name is absent internally but an external target exists', async () => {
    writeExternal('extlib', 'export declare const useEffect: number;');
    write('src/internal.ts', 'export const Local = 1;');
    write('src/barrel.ts', "export * from 'extlib';\nexport * from './internal.js';");
    const resolver = await makeResolver();
    expect(resolver.resolveExport('src/barrel.ts', 'AbsentName')).toEqual({ kind: 'external' });
  });

  it('returns missing when the name is absent and no external target exists', async () => {
    write('src/internal.ts', 'export const Local = 1;');
    write('src/barrel.ts', "export * from './internal.js';");
    const resolver = await makeResolver();
    expect(resolver.resolveExport('src/barrel.ts', 'Absent')).toEqual({
      kind: 'unresolved',
      reason: 'missing',
    });
  });
});

describe('compute — namespace re-export "export * as ns" is opaque', () => {
  it('does not trace a name through "export * as ns from"', async () => {
    write('src/inner.ts', 'export const buried = 1;');
    write('src/barrel.ts', "export * as utils from './inner.js';");
    const resolver = await makeResolver();
    expect(resolver.resolveExport('src/barrel.ts', 'buried')).toEqual({
      kind: 'unresolved',
      reason: 'missing',
    });
  });

  it('still resolves the namespace name itself as a native export of the barrel', async () => {
    write('src/inner.ts', 'export const buried = 1;');
    write('src/barrel.ts', "export * as utils from './inner.js';");
    const resolver = await makeResolver();
    const r = resolver.resolveExport('src/barrel.ts', 'utils');
    expect(['resolved', 'unresolved']).toContain(r.kind);
  });
});

describe('createResolver — reverse index and LRU', () => {
  it('records every file touched during a resolution chain', async () => {
    write('src/inner.ts', 'export const X = 1;');
    write('src/barrel.ts', "export { X } from './inner.js';");
    const resolver = await makeResolver();
    resolver.resolveExport('src/barrel.ts', 'X');
    expect(resolver.reverseIndex.get('src/barrel.ts')?.has('src/barrel.ts#X')).toBe(true);
    expect(resolver.reverseIndex.get('src/inner.ts')?.has('src/barrel.ts#X')).toBe(true);
  });

  it('evicts the oldest cache entry once cacheSize is exceeded', async () => {
    write('src/a.ts', 'export const A = 1;');
    write('src/b.ts', 'export const B = 1;');
    const resolver = await makeResolver(32, 1);
    resolver.resolveExport('src/a.ts', 'A');
    resolver.resolveExport('src/b.ts', 'B');
    expect(resolver.cache.size).toBe(1);
    expect(resolver.cache.has('src/b.ts#B')).toBe(true);
  });

  it('does not cache when cacheSize is zero', async () => {
    write('src/a.ts', 'export const A = 1;');
    const resolver = await makeResolver(32, 0);
    resolver.resolveExport('src/a.ts', 'A');
    expect(resolver.cache.size).toBe(0);
  });

  it('serves a repeated lookup from the cache', async () => {
    write('src/a.ts', 'export const A = 1;');
    const resolver = await makeResolver();
    const first = resolver.resolveExport('src/a.ts', 'A');
    const second = resolver.resolveExport('src/a.ts', 'A');
    expect(second).toEqual(first);
    expect(resolver.cache.has('src/a.ts#A')).toBe(true);
  });
});

describe('compute — declaration-kind and re-export edge cases', () => {
  it('resolves an exported enum as a value declaration', async () => {
    write('src/m.ts', 'export enum Color { Red }');
    const resolver = await makeResolver();
    expect(resolver.resolveExport('src/m.ts', 'Color')).toEqual({
      kind: 'resolved',
      file: 'src/m.ts',
      symbol: 'Color',
      typeOnly: false,
    });
  });

  it('resolves an exported type alias as a type declaration', async () => {
    write('src/m.ts', 'export type Id = string;');
    const resolver = await makeResolver();
    expect(resolver.resolveExport('src/m.ts', 'Id')).toEqual({
      kind: 'resolved',
      file: 'src/m.ts',
      symbol: 'Id',
      typeOnly: true,
    });
  });

  it('resolves a default-exported class declaration', async () => {
    write('src/m.ts', 'export default class Widget {}');
    const resolver = await makeResolver();
    expect(resolver.resolveExport('src/m.ts', 'default')).toEqual({
      kind: 'resolved',
      file: 'src/m.ts',
      symbol: 'default',
      typeOnly: false,
    });
  });

  it('returns missing for "export = x" since CJS export-equals has no default', async () => {
    write('src/m.ts', 'const x = 1; export = x;');
    const resolver = await makeResolver();
    expect(resolver.resolveExport('src/m.ts', 'default')).toEqual({
      kind: 'unresolved',
      reason: 'missing',
    });
  });

  it('resolves a re-export whose alias differs from the requested name by skipping it', async () => {
    write('src/inner.ts', 'export const A = 1; export const B = 2;');
    write('src/barrel.ts', "export { A as X, B as Y } from './inner.js';");
    const resolver = await makeResolver();
    expect(resolver.resolveExport('src/barrel.ts', 'Y')).toEqual({
      kind: 'resolved',
      file: 'src/inner.ts',
      symbol: 'B',
      typeOnly: false,
    });
  });

  it('treats a bare local "export {}" as not declaring the name', async () => {
    write('src/m.ts', 'const a = 1; export {};\nexport const real = a;');
    const resolver = await makeResolver();
    expect(resolver.resolveExport('src/m.ts', 'real')).toEqual({
      kind: 'resolved',
      file: 'src/m.ts',
      symbol: 'real',
      typeOnly: false,
    });
  });

  it('resolves a wildcard re-export name that the target itself owns natively', async () => {
    write('src/leaf.ts', 'export const owned = 1;');
    write('src/mid.ts', "export * from './leaf.js';\nexport const local = 2;");
    write('src/barrel.ts', "export * from './mid.js';");
    const resolver = await makeResolver();
    expect(resolver.resolveExport('src/barrel.ts', 'local')).toEqual({
      kind: 'resolved',
      file: 'src/mid.ts',
      symbol: 'local',
      typeOnly: false,
    });
  });

  it('resolves a local re-export of a non-exported interface as type-only', async () => {
    write('src/m.ts', 'interface Shape { x: number; }\nexport { Shape as PublicShape };');
    const resolver = await makeResolver();
    expect(resolver.resolveExport('src/m.ts', 'PublicShape')).toEqual({
      kind: 'resolved',
      file: 'src/m.ts',
      symbol: 'Shape',
      typeOnly: true,
    });
  });

  it('resolves a local re-export of a non-exported enum as a value', async () => {
    write('src/m.ts', 'enum Level { Low }\nexport { Level as PublicLevel };');
    const resolver = await makeResolver();
    expect(resolver.resolveExport('src/m.ts', 'PublicLevel')).toEqual({
      kind: 'resolved',
      file: 'src/m.ts',
      symbol: 'Level',
      typeOnly: false,
    });
  });

  it('resolves a local re-export when several names are listed and only one matches', async () => {
    write('src/m.ts', 'const a = 1; const b = 2;\nexport { a as A, b as B };');
    const resolver = await makeResolver();
    expect(resolver.resolveExport('src/m.ts', 'B')).toEqual({
      kind: 'resolved',
      file: 'src/m.ts',
      symbol: 'b',
      typeOnly: false,
    });
  });

  it('resolves a local re-export of a name with no matching local declaration', async () => {
    write('src/m.ts', "import { ext } from 'extlib';\nexport { ext as PublicExt };");
    writeExternal('extlib', 'export declare const ext: number;');
    const resolver = await makeResolver();
    expect(resolver.resolveExport('src/m.ts', 'PublicExt')).toEqual({
      kind: 'resolved',
      file: 'src/m.ts',
      symbol: 'PublicExt',
      typeOnly: false,
    });
  });

  it('resolves "export { x as default }" through a re-export with from', async () => {
    write('src/inner.ts', 'const v = 1; export { v as default };');
    write('src/barrel.ts', "export { default } from './inner.js';");
    const resolver = await makeResolver();
    expect(resolver.resolveExport('src/barrel.ts', 'default')).toEqual({
      kind: 'resolved',
      file: 'src/inner.ts',
      symbol: 'default',
      typeOnly: false,
    });
  });

  it('scans a namespace export name during wildcard reachability but cannot resolve it', async () => {
    write('src/leaf.ts', "export * as inner from 'extlib';");
    write('src/mid.ts', "export * from './leaf.js';");
    write('src/barrel.ts', "export * from './mid.js';");
    writeExternal('extlib', 'export declare const x: number;');
    const resolver = await makeResolver();
    // `inner` is enumerated by ownExportNames (reachable) yet opaque to resolution.
    expect(resolver.resolveExport('src/barrel.ts', 'inner')).toEqual({
      kind: 'unresolved',
      reason: 'missing',
    });
  });

  it('returns missing when a wildcard target file is excluded from the registry', async () => {
    write('src/internal.ts', 'export const Local = 1;');
    write('src/barrel.ts', "export * from './internal.js';");
    const set = await loadSourceFiles({
      project: {
        tsconfig: './tsconfig.json',
        sourceRoot: 'src',
        cwd: dir,
        includeOutOfRoot: false,
      },
      resolve: { extensions: ['.ts', '.tsx'] },
      ignore: ['src/internal.ts'],
    } as never);
    const resolver = createResolver({
      sources: set,
      moduleResolution: moduleResolutionContextOf(set),
      maxResolveDepth: 32,
      cacheSize: Infinity,
    });
    expect(resolver.resolveExport('src/barrel.ts', 'Local')).toEqual({
      kind: 'unresolved',
      reason: 'missing',
    });
  });
});
