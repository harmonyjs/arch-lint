/**
 * @fileoverview Tests for the view-region classifier — JSX detection and root subtrees.
 */
import { Project } from 'ts-morph';
import { describe, expect, it } from 'vitest';
import { hasJsx } from './region.js';

/** Parses one file into a throwaway in-memory project and returns its SourceFile. */
function parse(name: string, code: string) {
  const project = new Project({ useInMemoryFileSystem: true });
  return project.createSourceFile(name, code);
}

describe('hasJsx', () => {
  it('is true for a JSX element', () => {
    expect(hasJsx(parse('a.tsx', 'export const A = () => <div />;'))).toBe(true);
  });

  it('is true for a self-closing JSX element', () => {
    expect(hasJsx(parse('a.tsx', 'export const A = () => <img src="x" />;'))).toBe(true);
  });

  it('is true for a JSX fragment', () => {
    expect(hasJsx(parse('a.tsx', 'export const A = () => <>x</>;'))).toBe(true);
  });

  it('is false for a .tsx file with only types and re-exports', () => {
    expect(hasJsx(parse('a.tsx', "export type T = number;\nexport { x } from './x.js';"))).toBe(
      false,
    );
  });

  it('is false for a plain value module', () => {
    expect(hasJsx(parse('a.tsx', 'export const n = 1;'))).toBe(false);
  });
});
