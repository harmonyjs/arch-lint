/**
 * @fileoverview Tests for the max-lines rule of the perfile pack.
 */
import { describe, expect, it } from 'vitest';
import type { ResolvedConfig } from '../../../types.js';
import { makeContext } from '../../test-support/make-context.js';
import { makeGraph } from '../../test-support/make-graph.js';
import { only } from '../../test-support/only.js';
import { perfileTestGraph } from '../support/perfile-test-graph.js';
import { maxLines } from './index.js';

const CONFIG = {} as ResolvedConfig;

function run(files: Record<string, string>, options: Record<string, unknown>) {
  const graph = perfileTestGraph(files);
  const ctx = makeContext('max-lines', { severity: 'warning', project: graph.project, options });
  return maxLines.check(graph, CONFIG, ctx);
}

describe('max-lines', () => {
  it('passes a file under the limit', () => {
    expect(run({ 'src/a.ts': 'const a = 1;\n' }, { max: 200 })).toEqual([]);
  });

  it('flags a file with more code lines than max', () => {
    const body = `${Array.from({ length: 6 }, (_, i) => `const v${i} = ${i};`).join('\n')}\n`;
    const ds = run({ 'src/a.ts': body }, { max: 5, skipComments: true, skipBlankLines: true });
    const d = only(ds);
    expect(d.fingerprint).toBe('src/a.ts');
    expect(d.actual).toContain('6');
  });

  it('skips blank lines when skipBlankLines is true', () => {
    const body = 'const a = 1;\n\n\n\nconst b = 2;\n';
    expect(run({ 'src/a.ts': body }, { max: 3, skipBlankLines: true, skipComments: true })).toEqual(
      [],
    );
  });

  it('skips comment lines when skipComments is true', () => {
    const body = 'const a = 1;\n// c1\n// c2\n// c3\nconst b = 2;\n';
    expect(run({ 'src/a.ts': body }, { max: 3, skipComments: true, skipBlankLines: true })).toEqual(
      [],
    );
  });

  it('skips block comment lines when skipComments is true', () => {
    const body = 'const a = 1;\n/* c1\n c2\n c3 */\nconst b = 2;\n';
    expect(run({ 'src/a.ts': body }, { max: 3, skipComments: true, skipBlankLines: true })).toEqual(
      [],
    );
  });

  it('counts blank lines when skipBlankLines is false', () => {
    const body = 'const a = 1;\n\n\n\nconst b = 2;\n';
    const ds = run({ 'src/a.ts': body }, { max: 3, skipBlankLines: false, skipComments: true });
    expect(ds).toHaveLength(1);
  });

  it('counts comment lines when skipComments is false', () => {
    const body = 'const a = 1;\n// c1\n// c2\n// c3\nconst b = 2;\n';
    const ds = run({ 'src/a.ts': body }, { max: 3, skipComments: false, skipBlankLines: true });
    expect(ds).toHaveLength(1);
  });

  it('skips a node whose source file is absent from the project', () => {
    const graph = makeGraph({ nodes: { 'src/ghost.ts': { kind: 'file' } }, files: {} });
    const ctx = makeContext('max-lines', { project: graph.project, options: { max: 1 } });
    expect(maxLines.check(graph, CONFIG, ctx)).toEqual([]);
  });
});
