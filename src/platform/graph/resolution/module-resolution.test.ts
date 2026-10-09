/**
 * @fileoverview Tests for module specifier resolution against the TypeScript resolver.
 */

import { Project, ts } from 'ts-morph';
import { describe, expect, it } from 'vitest';
import {
  type ModuleResolutionContext,
  moduleResolutionContextOf,
  resolveSpecifier,
} from './module-resolution.js';

function makeCtx(files: Record<string, string>): ModuleResolutionContext {
  const compilerOptions: ts.CompilerOptions = {
    moduleResolution: ts.ModuleResolutionKind.Bundler,
    allowJs: false,
  };
  const moduleResolutionHost: ts.ModuleResolutionHost = {
    fileExists: (p) => Object.hasOwn(files, p),
    readFile: (p) => files[p],
    directoryExists: (dir) =>
      Object.keys(files).some((f) => f.startsWith(dir.endsWith('/') ? dir : `${dir}/`)),
    getCurrentDirectory: () => '/proj',
    getDirectories: () => [],
  };
  return { compilerOptions, moduleResolutionHost };
}

describe('resolveSpecifier — relative path without extension', () => {
  it('resolves "./Bar" to Bar.ts in the same directory', () => {
    const ctx = makeCtx({
      '/proj/src/App/App.tsx': 'x',
      '/proj/src/App/Bar.ts': 'y',
    });
    const result = resolveSpecifier('/proj/src/App/App.tsx', './Bar', ctx);
    expect(result).toEqual({ kind: 'internal', file: '/proj/src/App/Bar.ts' });
  });
});

describe('resolveSpecifier — index files', () => {
  it('resolves "./Header" to Header/index.ts', () => {
    const ctx = makeCtx({
      '/proj/src/App/App.tsx': 'x',
      '/proj/src/App/Header/index.ts': 'y',
    });
    const result = resolveSpecifier('/proj/src/App/App.tsx', './Header', ctx);
    expect(result).toEqual({ kind: 'internal', file: '/proj/src/App/Header/index.ts' });
  });
});

describe('resolveSpecifier — external packages', () => {
  it('marks a node_modules import as external', () => {
    const ctx = makeCtx({
      '/proj/src/App/App.tsx': 'x',
      '/proj/node_modules/react/index.d.ts': 'declare const x: number; export = x;',
      '/proj/node_modules/react/package.json': '{"name":"react","types":"index.d.ts"}',
    });
    const result = resolveSpecifier('/proj/src/App/App.tsx', 'react', ctx);
    expect(result).toEqual({ kind: 'external' });
  });
});

describe('resolveSpecifier — path alias', () => {
  it('resolves "@/lib/util" through compilerOptions.paths', () => {
    const compilerOptions: ts.CompilerOptions = {
      moduleResolution: ts.ModuleResolutionKind.Bundler,
      baseUrl: '/proj',
      paths: { '@/*': ['src/*'] },
    };
    const files: Record<string, string> = {
      '/proj/src/App/App.tsx': 'x',
      '/proj/src/lib/util.ts': 'y',
    };
    const ctx: ModuleResolutionContext = {
      compilerOptions,
      moduleResolutionHost: {
        fileExists: (p) => Object.hasOwn(files, p),
        readFile: (p) => files[p],
        directoryExists: (dir) =>
          Object.keys(files).some((f) => f.startsWith(dir.endsWith('/') ? dir : `${dir}/`)),
        getCurrentDirectory: () => '/proj',
        getDirectories: () => [],
      },
    };
    const result = resolveSpecifier('/proj/src/App/App.tsx', '@/lib/util', ctx);
    expect(result).toEqual({ kind: 'internal', file: '/proj/src/lib/util.ts' });
  });
});

describe('resolveSpecifier — unresolved', () => {
  it('returns unresolved for a missing relative file', () => {
    const ctx = makeCtx({ '/proj/src/App/App.tsx': 'x' });
    const result = resolveSpecifier('/proj/src/App/App.tsx', './Missing', ctx);
    expect(result).toEqual({ kind: 'unresolved' });
  });
});

describe('moduleResolutionContextOf', () => {
  it('builds a resolution context from the set project', () => {
    const project = new Project({ useInMemoryFileSystem: true });
    const set = { project, files: new Map(), census: [], rootDir: '/', cwd: '/' };
    expect(moduleResolutionContextOf(set).compilerOptions).toBeDefined();
  });
});
