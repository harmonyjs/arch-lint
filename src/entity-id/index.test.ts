/**
 * @fileoverview Tests for the canonical entity-id path-arithmetic module.
 */
import { describe, expect, it } from 'vitest';
import {
  ancestorsOf,
  baseNameOf,
  dirOf,
  dropExtension,
  firstSegment,
  folderOf,
  isUnderSegment,
  segmentsOf,
  stemOf,
} from './index.js';

describe('dirOf', () => {
  it('returns the directory portion of a nested file id', () => {
    expect(dirOf('src/auth/login.ts')).toBe('src/auth');
  });

  it('returns an empty string for a file id with no directory', () => {
    expect(dirOf('index.ts')).toBe('');
  });
});

describe('baseNameOf', () => {
  it('returns the final segment of a nested file id', () => {
    expect(baseNameOf('src/auth/login.ts')).toBe('login.ts');
  });

  it('returns the whole id when there is no directory', () => {
    expect(baseNameOf('index.ts')).toBe('index.ts');
  });
});

describe('dropExtension', () => {
  it('strips only the last extension', () => {
    expect(dropExtension('App.test.tsx')).toBe('App.test');
  });

  it('strips a single extension', () => {
    expect(dropExtension('login.ts')).toBe('login');
  });

  it('returns the name unchanged when there is no extension', () => {
    expect(dropExtension('Makefile')).toBe('Makefile');
  });

  it('does not strip a leading dot (dotfile)', () => {
    expect(dropExtension('.gitignore')).toBe('.gitignore');
  });
});

describe('stemOf', () => {
  it('strips a single extension', () => {
    expect(stemOf('login.ts')).toBe('login');
  });

  it('strips every extension — the text before the first dot', () => {
    expect(stemOf('App.test.tsx')).toBe('App');
  });

  it('returns the name unchanged when there is no extension', () => {
    expect(stemOf('Makefile')).toBe('Makefile');
  });
});

describe('segmentsOf', () => {
  it('splits a path into segments', () => {
    expect(segmentsOf('src/App/items/Foo')).toEqual(['src', 'App', 'items', 'Foo']);
  });

  it('drops the extension of the last segment', () => {
    expect(segmentsOf('src/App/App.tsx')).toEqual(['src', 'App', 'App']);
  });

  it('normalizes leading and trailing slashes', () => {
    expect(segmentsOf('/src/App/')).toEqual(['src', 'App']);
  });

  it('returns an empty array for the empty string', () => {
    expect(segmentsOf('')).toEqual([]);
  });
});

describe('ancestorsOf', () => {
  it('lists the directory ancestors nearest-first', () => {
    expect(ancestorsOf('src/graph/model/tree.ts')).toEqual([
      'src/graph/model',
      'src/graph',
      'src',
    ]);
  });

  it('returns an empty array for a top-level id', () => {
    expect(ancestorsOf('index.ts')).toEqual([]);
  });
});
