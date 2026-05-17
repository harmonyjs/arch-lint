/**
 * @fileoverview Tests for the structure-pack path helpers.
 */
import { describe, expect, it } from 'vitest';
import { baseNameOf, dirOf, isTestFile, stemOf } from './file-paths.js';

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

describe('isTestFile', () => {
  it('is true for a *.test.* name', () => {
    expect(isTestFile('App.test.tsx')).toBe(true);
  });

  it('is false for a plain source name', () => {
    expect(isTestFile('App.tsx')).toBe(false);
  });

  it('is false for a name that merely contains "test" without the dotted infix', () => {
    expect(isTestFile('tester.ts')).toBe(false);
  });
});
