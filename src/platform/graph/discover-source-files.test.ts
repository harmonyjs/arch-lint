/**
 * @fileoverview Tests for source-file discovery: traversal, extension filter, ignore globs.
 */

import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  discoverSourceFilePaths,
  loadSourceFiles,
  moduleResolutionContextOf,
} from './discover-source-files.js';

let dir: string;

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'arch-lint-src-'));
  mkdirSync(join(dir, 'src/App'), { recursive: true });
  mkdirSync(join(dir, 'src/legacy'), { recursive: true });
  writeFileSync(join(dir, 'src/App/App.tsx'), 'export const App = 1;');
  writeFileSync(join(dir, 'src/App/util.ts'), 'export const util = 1;');
  writeFileSync(join(dir, 'src/App/App.test.ts'), 'test;');
  writeFileSync(join(dir, 'src/App/styles.css'), 'body{}');
  writeFileSync(join(dir, 'src/legacy/old.ts'), 'export const old = 1;');
});

afterEach(() => {
  rmSync(dir, { recursive: true, force: true });
});

describe('discoverSourceFilePaths', () => {
  it('returns .ts/.tsx files under sourceRoot, sorted, ignoring patterns', async () => {
    const paths = await discoverSourceFilePaths({
      cwd: dir,
      sourceRoot: 'src',
      extensions: ['.ts', '.tsx'],
      ignore: ['**/*.test.ts', 'src/legacy/**'],
    });
    expect(paths).toEqual(['src/App/App.tsx', 'src/App/util.ts']);
  });
});

describe('loadSourceFiles', () => {
  it('builds a ts-morph Project with a file registry keyed by file id', async () => {
    writeFileSync(join(dir, 'tsconfig.json'), '{"compilerOptions":{"strict":true}}');
    const set = await loadSourceFiles({
      project: {
        tsconfig: './tsconfig.json',
        sourceRoot: 'src',
        cwd: dir,
        includeOutOfRoot: false,
      },
      resolve: { extensions: ['.ts', '.tsx'] },
      ignore: ['**/*.test.ts', 'src/legacy/**'],
    } as never);
    expect([...set.files.keys()].sort()).toEqual(['src/App/App.tsx', 'src/App/util.ts']);
    const appFile = set.files.get('src/App/App.tsx');
    expect(appFile).toBeDefined();
    expect(appFile?.getVariableDeclaration('App')).toBeDefined();
    expect(set.rootDir).toBe(join(dir, 'src'));
  });
});

describe('loadSourceFiles census', () => {
  it('exposes a census of every ignore-surviving file, test files included', async () => {
    writeFileSync(join(dir, 'tsconfig.json'), '{"compilerOptions":{"strict":true}}');
    const set = await loadSourceFiles({
      project: {
        tsconfig: './tsconfig.json',
        sourceRoot: 'src',
        cwd: dir,
        includeOutOfRoot: false,
      },
      resolve: { extensions: ['.ts', '.tsx'] },
      ignore: ['src/legacy/**'],
    } as never);
    expect([...set.census].sort()).toEqual([
      'src/App/App.test.ts',
      'src/App/App.tsx',
      'src/App/util.ts',
    ]);
  });
});

describe('moduleResolutionContextOf', () => {
  it('builds a resolution context from the set project', async () => {
    writeFileSync(join(dir, 'tsconfig.json'), '{"compilerOptions":{"strict":true}}');
    const set = await loadSourceFiles({
      project: {
        tsconfig: './tsconfig.json',
        sourceRoot: 'src',
        cwd: dir,
        includeOutOfRoot: false,
      },
      resolve: { extensions: ['.ts', '.tsx'] },
      ignore: [],
    } as never);
    expect(moduleResolutionContextOf(set).compilerOptions).toBeDefined();
  });
});
