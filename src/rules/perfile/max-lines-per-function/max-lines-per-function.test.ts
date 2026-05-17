/**
 * @fileoverview Tests for the max-lines-per-function rule of the perfile pack.
 */
import { describe, expect, it } from 'vitest';
import type { ResolvedConfig } from '../../../config/types.js';
import { makeContext } from '../../test-support/make-context.js';
import { makeGraph } from '../../test-support/make-graph.js';
import { perfileTestGraph } from '../../test-support/perfile-test-graph.js';
import { only } from '../../test-support/only.js';
import { maxLinesPerFunction } from './index.js';

const CONFIG = {} as ResolvedConfig;

function run(files: Record<string, string>, max: number) {
  const graph = perfileTestGraph(files);
  const ctx = makeContext('max-lines-per-function', {
    severity: 'warning',
    project: graph.project,
    options: { max },
  });
  return maxLinesPerFunction.check(graph, CONFIG, ctx);
}

describe('max-lines-per-function', () => {
  it('passes a short function', () => {
    expect(run({ 'src/a.ts': 'function f() { return 1; }\n' }, 60)).toEqual([]);
  });

  it('flags a function longer than max', () => {
    const body = `function big() {\n${'  let x = 0;\n'.repeat(8)}}\n`;
    const ds = run({ 'src/a.ts': body }, 5);
    expect(only(ds).fingerprint).toBe('src/a.ts#big');
  });

  it('uses qualified path for a class method fingerprint', () => {
    const body = `class C {\n  render() {\n${'    let x = 0;\n'.repeat(8)}  }\n}\n`;
    const ds = run({ 'src/a.ts': body }, 4);
    expect(only(ds).fingerprint).toBe('src/a.ts#C.render');
  });

  it('points location at the function start line', () => {
    const body = `\n\nfunction big() {\n${'  let x = 0;\n'.repeat(8)}}\n`;
    const ds = run({ 'src/a.ts': body }, 5);
    expect(only(ds).location.line).toBe(3);
  });

  it('skips a node whose source file is absent from the project', () => {
    const graph = makeGraph({ nodes: { 'src/ghost.ts': { kind: 'file' } }, files: {} });
    const ctx = makeContext('max-lines-per-function', {
      project: graph.project,
      options: { max: 1 },
    });
    expect(maxLinesPerFunction.check(graph, CONFIG, ctx)).toEqual([]);
  });
});
