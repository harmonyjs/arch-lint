/**
 * @fileoverview Tests for the single-entity-per-file rule of the perfile pack.
 */
import { describe, expect, it } from 'vitest';
import type { ResolvedConfig } from '#config/types.js';
import { makeContext } from '#rules/test-support/make-context.js';
import { only } from '#rules/test-support/only.js';
import { perfileTestGraph } from '#rules/test-support/perfile-test-graph.js';
import { singleEntityPerFile } from './index.js';

const CONFIG = {} as ResolvedConfig;

function run(files: Record<string, string>) {
  const graph = perfileTestGraph(files);
  const ctx = makeContext('single-entity-per-file', { project: graph.project });
  return singleEntityPerFile.check(graph, CONFIG, ctx);
}

describe('single-entity-per-file', () => {
  it('passes a file with one exported class', () => {
    expect(run({ 'src/a.ts': 'export class Widget {}\n' })).toEqual([]);
  });

  it('passes a file with one component plus helper non-entity exports', () => {
    expect(
      run({
        'src/a.tsx': 'export function Button() { return null; }\nexport const cssClass = "btn";\n',
      }),
    ).toEqual([]);
  });

  it('flags a file with two exported classes', () => {
    const ds = run({ 'src/a.ts': 'export class A {}\nexport class B {}\n' });
    expect(only(ds).fingerprint).toBe('src/a.ts');
  });

  it('flags a file with a class and a component', () => {
    const ds = run({ 'src/a.tsx': 'export class Store {}\nexport const Panel = () => null;\n' });
    expect(ds).toHaveLength(1);
  });

  it('does not count non-exported classes', () => {
    expect(run({ 'src/a.ts': 'export class A {}\nclass Internal {}\n' })).toEqual([]);
  });

  it('does not count exported lowercase functions as entities', () => {
    expect(run({ 'src/a.ts': 'export class A {}\nexport function helper() {}\n' })).toEqual([]);
  });
});
