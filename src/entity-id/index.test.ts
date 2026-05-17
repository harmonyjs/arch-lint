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
