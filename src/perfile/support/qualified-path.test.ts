/**
 * @fileoverview Tests for the qualified function path builder backing perfile fingerprints (§10.2).
 */
import { describe, it, expect } from 'vitest';
import { Project, SyntaxKind } from 'ts-morph';
import { qualifiedFunctionPath } from './qualified-path.js';

function pathsOf(code: string): string[] {
  const project = new Project({ useInMemoryFileSystem: true });
  const sf = project.createSourceFile('m.ts', code);
  const kinds = [
    SyntaxKind.FunctionDeclaration,
    SyntaxKind.MethodDeclaration,
    SyntaxKind.ArrowFunction,
    SyntaxKind.FunctionExpression,
  ];
  return kinds.flatMap((k) => sf.getDescendantsOfKind(k)).map(qualifiedFunctionPath);
}

describe('qualifiedFunctionPath', () => {
  it('names a top-level function declaration', () => {
    expect(pathsOf('function foo() {}')).toEqual(['foo']);
  });

  it('joins class and method with a dot', () => {
    expect(pathsOf('class Widget { render() {} }')).toEqual(['Widget.render']);
  });

  it('names an arrow assigned to a const', () => {
    expect(pathsOf('const handler = () => {};')).toEqual(['handler']);
  });

  it('names a function expression assigned to a const', () => {
    expect(pathsOf('const make = function () {};')).toEqual(['make']);
  });

  it('joins nested named functions with a dot', () => {
    expect(pathsOf('function outer() { function inner() {} }')).toEqual([
      'outer',
      'outer.inner',
    ]);
  });

  it('indexes anonymous callbacks by sibling order under their named ancestor', () => {
    const code = 'function host() { arr.map(() => 1); arr.filter(() => 2); }';
    expect(pathsOf(code)).toEqual(['host', 'host#cb0', 'host#cb1']);
  });

  it('labels an unnamed default export as default', () => {
    expect(pathsOf('export default function () {}')).toEqual(['default']);
  });

  it('names an object-property arrow by the property name', () => {
    expect(pathsOf('const api = { fetchUser: () => {} };')).toEqual(['api.fetchUser']);
  });
});
