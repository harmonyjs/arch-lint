/**
 * @fileoverview Tests for the pure parts of changed-files detection.
 */
import { describe, expect, it } from 'vitest';
import { gitDiffArgs, parseDiffOutput } from './changed-files.js';

describe('gitDiffArgs', () => {
  it('without base diffs against HEAD (staged + unstaged)', () => {
    expect(gitDiffArgs(undefined)).toEqual(['diff', '--name-only', 'HEAD']);
  });

  it('with base diffs against the merge-base placeholder', () => {
    expect(gitDiffArgs('main')).toEqual(['diff', '--name-only', '<merge-base>']);
  });
});

describe('parseDiffOutput', () => {
  it('splits non-empty lines into trimmed paths', () => {
    expect(parseDiffOutput('src/a.ts\nsrc/b.tsx\n')).toEqual(['src/a.ts', 'src/b.tsx']);
  });

  it('returns an empty array for empty output', () => {
    expect(parseDiffOutput('')).toEqual([]);
    expect(parseDiffOutput('\n\n')).toEqual([]);
  });
});
