/**
 * @fileoverview Tests for the normalized parse of a file's import/export constructs.
 */
import { describe, it, expect } from 'vitest';
import { Project } from 'ts-morph';
import { importsOf } from './import-info.js';

function parse(code: string) {
  const project = new Project({ useInMemoryFileSystem: true });
  return importsOf(project.createSourceFile('/m.ts', code));
}

describe('importsOf', () => {
  it('parses a named import', () => {
    const [i] = parse(`import { Foo, Bar } from './x';`);
    expect(i).toMatchObject({
      kind: 'import',
      specifier: './x',
      typeOnly: false,
      named: ['Foo', 'Bar'],
      hasNamespace: false,
      hasDefault: false,
      sideEffectOnly: false,
    });
  });

  it('marks a type-only import', () => {
    const [i] = parse(`import type { T } from './x';`);
    expect(i?.typeOnly).toBe(true);
  });

  it('recognizes default and namespace imports', () => {
    const [d] = parse(`import D from './x';`);
    expect(d?.hasDefault).toBe(true);
    const [n] = parse(`import * as ns from './x';`);
    expect(n?.hasNamespace).toBe(true);
  });

  it('recognizes a side-effect-only import', () => {
    const [i] = parse(`import './x';`);
    expect(i).toMatchObject({ kind: 'import', sideEffectOnly: true, named: [] });
  });

  it('parses a named re-export with from', () => {
    const [e] = parse(`export { Foo as Baz } from './x';`);
    expect(e).toMatchObject({
      kind: 'reexport',
      specifier: './x',
      named: ['Baz'],
      wildcard: false,
    });
  });

  it('recognizes a wildcard re-export', () => {
    const [w] = parse(`export * from './x';`);
    expect(w).toMatchObject({ kind: 'reexport', wildcard: true, namespaceName: null });
  });

  it('recognizes a namespace re-export export * as ns', () => {
    const [w] = parse(`export * as ns from './x';`);
    expect(w).toMatchObject({ kind: 'reexport', wildcard: true, namespaceName: 'ns' });
  });

  it('marks a type-only re-export', () => {
    const [e] = parse(`export type { T } from './x';`);
    expect(e?.typeOnly).toBe(true);
  });

  it('gives 1-based line and column for the construct', () => {
    const [i] = parse(`\nimport { A } from './x';`);
    expect(i?.location.line).toBe(2);
    expect(i?.location.column).toBe(1);
  });

  it('uses the source name for a re-export with no alias', () => {
    const [e] = parse(`export { Plain } from './x';`);
    expect(e?.named).toEqual(['Plain']);
  });

  it('parses a re-export with several named bindings', () => {
    const [e] = parse(`export { A, B as C } from './x';`);
    expect(e?.named).toEqual(['A', 'C']);
  });

  it('ignores a local export without from', () => {
    expect(parse(`export const x = 1;`)).toEqual([]);
  });

  it('parses a file mixing imports and re-exports', () => {
    const out = parse(`import { A } from './a';\nexport { B } from './b';`);
    expect(out).toHaveLength(2);
    expect(out.map((i) => i.kind)).toEqual(['import', 'reexport']);
  });
});
