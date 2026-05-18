/**
 * @fileoverview Tests for the orphan-test rule.
 */
import { describe, expect, it } from 'vitest';
import { makeCensusContext } from '#rules/test-support/make-context.js';
import { only } from '#rules/test-support/only.js';
import { orphanTest } from './index.js';

describe('orphanTest', () => {
  it('has the canonical metadata', () => {
    expect(orphanTest.id).toBe('orphan-test');
    expect(orphanTest.pack).toBe('structure');
    expect(orphanTest.engine).toBe('census');
    expect(orphanTest.defaultSeverity).toBe('warning');
  });

  it('flags a test file with no source sibling', () => {
    const ctx = makeCensusContext('orphan-test', { census: ['src/a/widget.test.ts'] });
    const d = only(orphanTest.check(ctx));
    expect(d.entity).toBe('src/a/widget.test.ts');
    expect(d.fingerprint).toBe('orphan-test#src/a/widget.test.ts');
    expect(d.message).toBe('test file src/a/widget.test.ts has no local subject');
    expect(d.location).toEqual({ file: 'src/a/widget.test.ts', line: 1, column: 1 });
  });

  it('does not flag a test with a same-name .ts source sibling', () => {
    const ctx = makeCensusContext('orphan-test', {
      census: ['src/a/widget.ts', 'src/a/widget.test.ts'],
    });
    expect(orphanTest.check(ctx)).toEqual([]);
  });

  it('does not flag a test with a same-name .tsx source sibling', () => {
    const ctx = makeCensusContext('orphan-test', {
      census: ['src/a/Widget.tsx', 'src/a/Widget.test.tsx'],
    });
    expect(orphanTest.check(ctx)).toEqual([]);
  });

  it('exempts a test that already lives inside the testFolder', () => {
    const ctx = makeCensusContext('orphan-test', { census: ['src/tests/widget.test.ts'] });
    expect(orphanTest.check(ctx)).toEqual([]);
  });

  it('respects a custom testFolder option', () => {
    const ctx = makeCensusContext('orphan-test', {
      census: ['src/__tests__/widget.test.ts'],
      options: { testFolder: '__tests__' },
    });
    expect(orphanTest.check(ctx)).toEqual([]);
  });

  it('does not treat a sibling test file as a source for another test', () => {
    const ctx = makeCensusContext('orphan-test', {
      census: ['src/a/Widget.test.ts', 'src/a/Widget.test.tsx'],
    });
    expect(orphanTest.check(ctx)).toHaveLength(2);
  });

  it('requires the source sibling to be in the same directory', () => {
    const ctx = makeCensusContext('orphan-test', {
      census: ['src/a/widget.ts', 'src/b/widget.test.ts'],
    });
    expect(only(orphanTest.check(ctx)).entity).toBe('src/b/widget.test.ts');
  });

  it('emits nothing for an empty census', () => {
    expect(orphanTest.check(makeCensusContext('orphan-test'))).toEqual([]);
  });
});
