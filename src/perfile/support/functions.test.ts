/**
 * @fileoverview Tests for the file function-declaration scanner used by perfile rules.
 */
import { describe, it, expect } from 'vitest';
import { Project } from 'ts-morph';
import { collectFunctions } from './functions.js';

function unitsOf(code: string): ReturnType<typeof collectFunctions> {
  const project = new Project({ useInMemoryFileSystem: true });
  return collectFunctions(project.createSourceFile('m.ts', code));
}

describe('collectFunctions', () => {
  it('collects function declarations, methods, arrows and function expressions', () => {
    const units = unitsOf(
      'function a() {} class C { m() {} } const b = () => {}; const c = function () {};',
    );
    expect(units.map((u) => u.qualifiedPath).sort()).toEqual(['C.m', 'a', 'b', 'c']);
  });

  it('exposes the ts-morph node for each unit', () => {
    const units = unitsOf('function only() {}');
    expect(units[0]!.node.getKindName()).toBe('FunctionDeclaration');
  });

  it('returns an empty list for a file with no functions', () => {
    expect(unitsOf('export const x = 1;')).toEqual([]);
  });
});
