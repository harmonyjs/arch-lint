/**
 * @fileoverview Tests for the orphan-test rule.
 */
import { describe, expect, it } from 'vitest';
import type { ResolvedConfig } from '../../../config/types.js';
import { makeContext } from '../../test-support/make-context.js';
import { makeGraph } from '../../test-support/make-graph.js';
import { only } from '../../test-support/only.js';
import { orphanTest } from './index.js';

const cfg = {} as ResolvedConfig;

describe('orphanTest', () => {
  it('has the canonical metadata', () => {
    expect(orphanTest.id).toBe('orphan-test');
    expect(orphanTest.pack).toBe('structure');
    expect(orphanTest.engine).toBe('graph');
    expect(orphanTest.defaultSeverity).toBe('warning');
  });

  it('flags a test file with no source sibling', () => {
    const g = makeGraph({ nodes: { 'src/a/widget.test.ts': {} } });
    const out = orphanTest.check(g, cfg, makeContext('orphan-test'));
    const d = only(out);
    expect(d.entity).toBe('src/a/widget.test.ts');
    expect(d.fingerprint).toBe('orphan-test#src/a/widget.test.ts');
    expect(d.message).toBe('test file src/a/widget.test.ts has no local subject');
    expect(d.location).toEqual({ file: 'src/a/widget.test.ts', line: 1, column: 1 });
  });

  it('does not flag a test with a same-name .ts source sibling', () => {
    const g = makeGraph({
      nodes: { 'src/a/widget.ts': {}, 'src/a/widget.test.ts': {} },
    });
    expect(orphanTest.check(g, cfg, makeContext('orphan-test'))).toEqual([]);
  });

  it('does not flag a test with a same-name .tsx source sibling', () => {
    const g = makeGraph({
      nodes: { 'src/a/Widget.tsx': {}, 'src/a/Widget.test.tsx': {} },
    });
    expect(orphanTest.check(g, cfg, makeContext('orphan-test'))).toEqual([]);
  });

  it('exempts a test that already lives inside the testFolder', () => {
    const g = makeGraph({ nodes: { 'src/tests/widget.test.ts': {} } });
    expect(orphanTest.check(g, cfg, makeContext('orphan-test'))).toEqual([]);
  });

  it('respects a custom testFolder option', () => {
    const g = makeGraph({ nodes: { 'src/__tests__/widget.test.ts': {} } });
    const ctx = makeContext('orphan-test', { options: { testFolder: '__tests__' } });
    expect(orphanTest.check(g, cfg, ctx)).toEqual([]);
  });

  it('does not treat a sibling test file as a source for another test', () => {
    const g = makeGraph({
      nodes: { 'src/a/Widget.test.ts': {}, 'src/a/Widget.test.tsx': {} },
    });
    expect(orphanTest.check(g, cfg, makeContext('orphan-test'))).toHaveLength(2);
  });

  it('requires the source sibling to be in the same directory', () => {
    const g = makeGraph({
      nodes: { 'src/a/widget.ts': {}, 'src/b/widget.test.ts': {} },
    });
    const out = orphanTest.check(g, cfg, makeContext('orphan-test'));
    expect(only(out).entity).toBe('src/b/widget.test.ts');
  });

  it('emits nothing for an empty graph', () => {
    expect(orphanTest.check(makeGraph({}), cfg, makeContext('orphan-test'))).toEqual([]);
  });
});
