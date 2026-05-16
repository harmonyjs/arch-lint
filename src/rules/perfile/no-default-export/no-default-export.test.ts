/**
 * @fileoverview Tests for the no-default-export rule of the perfile pack.
 */
import { describe, expect, it } from 'vitest';
import type { ResolvedConfig } from '../../../types.js';
import { makeContext } from '../../test-support/make-context.js';
import { makeGraph } from '../../test-support/make-graph.js';
import { perfileTestGraph } from '../support/perfile-test-graph.js';
import { noDefaultExport } from './index.js';

const CONFIG = {} as ResolvedConfig;

function run(files: Record<string, string>, exemptPaths: readonly string[] = []) {
  const graph = perfileTestGraph(files);
  const ctx = makeContext('no-default-export', {
    project: graph.project,
    options: { exemptPaths },
  });
  return noDefaultExport.check(graph, CONFIG, ctx);
}

describe('no-default-export', () => {
  it('passes a file with only named exports', () => {
    expect(run({ 'src/a.ts': 'export const a = 1;\n' })).toEqual([]);
  });

  it('flags export default of a declaration', () => {
    const ds = run({ 'src/a.ts': 'export default function f() {}\n' });
    expect(ds).toHaveLength(1);
    expect(ds[0]!.fingerprint).toBe('src/a.ts');
  });

  it('flags an export { x as default } re-binding', () => {
    const ds = run({ 'src/a.ts': 'const x = 1;\nexport { x as default };\n' });
    expect(ds).toHaveLength(1);
  });

  it('does not flag a file matched by exemptPaths', () => {
    expect(
      run({ 'src/pages/home.tsx': 'export default function Home() {}\n' }, ['src/pages/**']),
    ).toEqual([]);
  });

  it('reports the line of the default export', () => {
    const ds = run({ 'src/a.ts': 'const x = 1;\nexport default x;\n' });
    expect(ds[0]!.location.line).toBe(2);
  });

  it('skips a node whose source file is absent from the project', () => {
    const graph = makeGraph({ nodes: { 'src/ghost.ts': { kind: 'file' } }, files: {} });
    const ctx = makeContext('no-default-export', {
      project: graph.project,
      options: { exemptPaths: [] },
    });
    expect(noDefaultExport.check(graph, CONFIG, ctx)).toEqual([]);
  });
});
