/**
 * @fileoverview Tests for the complexity rule of the perfile pack (cognitive complexity, D4).
 */
import { describe, expect, it } from 'vitest';
import type { ResolvedConfig } from '../../../config/types.js';
import { makeContext } from '../../test-support/make-context.js';
import { makeGraph } from '../../test-support/make-graph.js';
import { perfileTestGraph } from '../../test-support/perfile-test-graph.js';
import { complexity } from './index.js';

const CONFIG = {} as ResolvedConfig;

function run(files: Record<string, string>, max: number) {
  const graph = perfileTestGraph(files);
  const ctx = makeContext('complexity', {
    severity: 'warning',
    project: graph.project,
    options: { max },
  });
  return complexity.check(graph, CONFIG, ctx);
}

describe('complexity', () => {
  it('passes a simple function under the threshold', () => {
    expect(run({ 'src/a.ts': 'function f(x: number) { if (x) return 1; }\n' }, 15)).toEqual([]);
  });

  it('flags a function exceeding the cognitive complexity threshold', () => {
    const body = 'function f(x: number) { if (x) { if (x) { if (x) {} } } }\n'; // 1 + 2 + 3 = 6
    const ds = run({ 'src/a.ts': body }, 5);
    expect(ds).toHaveLength(1);
    expect(ds[0]!.fingerprint).toBe('src/a.ts#f');
    expect(ds[0]!.actual).toContain('6');
  });

  it('does not flag a function at exactly the threshold', () => {
    const body = 'function f(x: number) { if (x) { if (x) {} } }\n'; // 1 + 2 = 3
    expect(run({ 'src/a.ts': body }, 3)).toEqual([]);
  });

  it('skips a node whose source file is absent from the project', () => {
    const graph = makeGraph({ nodes: { 'src/ghost.ts': { kind: 'file' } }, files: {} });
    const ctx = makeContext('complexity', { project: graph.project, options: { max: 0 } });
    expect(complexity.check(graph, CONFIG, ctx)).toEqual([]);
  });
});
