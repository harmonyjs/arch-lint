/**
 * @fileoverview Tests for the max-optional-params rule of the perfile pack.
 */
import { describe, expect, it } from 'vitest';
import type { ResolvedConfig } from '../../../types.js';
import { makeContext } from '../../test-support/make-context.js';
import { makeGraph } from '../../test-support/make-graph.js';
import { perfileTestGraph } from '../support/perfile-test-graph.js';
import { maxOptionalParams } from './index.js';

const CONFIG = {} as ResolvedConfig;

function run(files: Record<string, string>, max: number) {
  const graph = perfileTestGraph(files);
  const ctx = makeContext('max-optional-params', {
    severity: 'warning',
    project: graph.project,
    options: { max },
  });
  return maxOptionalParams.check(graph, CONFIG, ctx);
}

describe('max-optional-params', () => {
  it('passes a function with required params and one optional', () => {
    expect(run({ 'src/a.ts': 'function f(a: number, b?: number) {}\n' }, 3)).toEqual([]);
  });

  it('flags a function with more optional params than max', () => {
    const ds = run({ 'src/a.ts': 'function f(a?: 1, b?: 1, c?: 1, d?: 1) {}\n' }, 3);
    expect(ds).toHaveLength(1);
    expect(ds[0]!.fingerprint).toBe('src/a.ts#f');
    expect(ds[0]!.actual).toContain('4');
  });

  it('counts default-valued params as optional', () => {
    const ds = run({ 'src/a.ts': 'function f(a = 1, b = 2, c = 3, d = 4) {}\n' }, 3);
    expect(ds).toHaveLength(1);
  });

  it('does not count required params', () => {
    expect(run({ 'src/a.ts': 'function f(a: 1, b: 1, c: 1, d: 1, e: 1) {}\n' }, 3)).toEqual([]);
  });

  it('skips a node whose source file is absent from the project', () => {
    const graph = makeGraph({ nodes: { 'src/ghost.ts': { kind: 'file' } }, files: {} });
    const ctx = makeContext('max-optional-params', { project: graph.project, options: { max: 0 } });
    expect(maxOptionalParams.check(graph, CONFIG, ctx)).toEqual([]);
  });
});
