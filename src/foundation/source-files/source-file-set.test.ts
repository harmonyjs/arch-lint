/**
 * @fileoverview Tests for fileIdOf — absolute path to cwd-relative POSIX file id.
 */
import { describe, expect, it } from 'vitest';
import { fileIdOf, type SourceFileSet } from './source-file-set.js';

describe('fileIdOf', () => {
  it('converts an absolute path to a cwd-relative POSIX file id', () => {
    const set = { cwd: '/proj' } as SourceFileSet;
    expect(fileIdOf('/proj/src/App/App.tsx', set)).toBe('src/App/App.tsx');
  });
});
