/**
 * @fileoverview Tests for the max-params rule of the perfile pack.
 */
import { describe, expect, it } from 'vitest';
import type { ResolvedConfig } from '../../../config/types.js';
import { makeContext } from '../../test-support/make-context.js';
import { makeGraph } from '../../test-support/make-graph.js';
import { only } from '../../test-support/only.js';
import { perfileTestGraph } from '../../test-support/perfile-test-graph.js';
import { maxParams } from './index.js';

const CONFIG = {} as ResolvedConfig;

function run(files: Record<string, string>, max: number) {
  const graph = perfileTestGraph(files);
  const ctx = makeContext('max-params', {
    severity: 'warning',
    project: graph.project,
    options: { max },
  });
  return maxParams.check(graph, CONFIG, ctx);
}

describe('max-params', () => {
  it('passes a function within the parameter limit', () => {
    expect(run({ 'src/a.ts': 'function f(a: number, b: number) {}\n' }, 4)).toEqual([]);
  });

  it('flags a function with more parameters than max', () => {
    const ds = run({ 'src/a.ts': 'function f(a: 1, b: 1, c: 1, d: 1, e: 1) {}\n' }, 4);
    const d = only(ds);
    expect(d.fingerprint).toBe('src/a.ts#f');
    expect(d.actual).toContain('5');
  });

  it('passes a function exactly at the limit', () => {
    expect(run({ 'src/a.ts': 'function f(a: 1, b: 1, c: 1, d: 1) {}\n' }, 4)).toEqual([]);
  });

  it('counts rest parameters', () => {
    const ds = run({ 'src/a.ts': 'function f(a: 1, b: 1, c: 1, ...rest: 1[]) {}\n' }, 3);
    expect(ds).toHaveLength(1);
  });

  it('skips a node whose source file is absent from the project', () => {
    const graph = makeGraph({ nodes: { 'src/ghost.ts': { kind: 'file' } }, files: {} });
    const ctx = makeContext('max-params', { project: graph.project, options: { max: 0 } });
    expect(maxParams.check(graph, CONFIG, ctx)).toEqual([]);
  });
});
