/**
 * @fileoverview Tests for graph-node classification (component-folder, barrel, role folder).
 */
import { describe, expect, it } from 'vitest';
import type { ConventionsConfig } from '#config/types.js';
import {
  componentFolderOf,
  isBarrelFile,
  isComponentFolderEntry,
  roleFolderSegment,
} from './node-helpers.js';

const conventions: ConventionsConfig = {
  privateSegment: 'slots',
  sharedSegment: 'items',
  libSegment: 'lib',
  hooksSegment: 'hooks',
  explicitClusterSegment: 'ui',
  modelSegment: 'model',
  indexFiles: ['index.ts', 'index.tsx'],
};

describe('isBarrelFile', () => {
  it('is true when the file is index.ts', () => {
    expect(isBarrelFile('src/App/index.ts', conventions)).toBe(true);
  });
  it('is true when the file is index.tsx', () => {
    expect(isBarrelFile('src/App/index.tsx', conventions)).toBe(true);
  });
  it('is false for a regular file', () => {
    expect(isBarrelFile('src/App/App.tsx', conventions)).toBe(false);
  });
});

describe('isComponentFolderEntry', () => {
  it('is true for a file same-named with its folder', () => {
    expect(isComponentFolderEntry('src/App/App.tsx')).toBe(true);
  });
  it('is false for a file that is not same-named', () => {
    expect(isComponentFolderEntry('src/App/Header.tsx')).toBe(false);
  });
  it('is false for a barrel', () => {
    expect(isComponentFolderEntry('src/App/index.ts')).toBe(false);
  });
  it('is false for a top-level file with no parent folder', () => {
    expect(isComponentFolderEntry('App.tsx')).toBe(false);
  });
});

describe('componentFolderOf', () => {
  it('returns the nearest component folder for a file inside it', () => {
    const folders = new Set(['src/App', 'src/App/Header']);
    expect(componentFolderOf('src/App/Header/util.ts', folders)).toBe('src/App/Header');
  });
  it('returns null for a file outside any component folder', () => {
    expect(componentFolderOf('src/util.ts', new Set(['src/App']))).toBeNull();
  });
});

describe('roleFolderSegment', () => {
  it('returns the role segment when the folder is one', () => {
    expect(roleFolderSegment('src/App/lib', conventions)).toBe('lib');
  });
  it('returns null when the folder is not a role segment', () => {
    expect(roleFolderSegment('src/App/Header', conventions)).toBeNull();
  });
});
