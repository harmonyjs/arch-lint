/**
 * @fileoverview Tests for the view-region classifier — JSX detection and root subtrees.
 */
import { Project } from 'ts-morph';
import { describe, expect, it } from 'vitest';
import { classifyRegion, classifyRegionFromPrefixes, hasJsx } from './region.js';

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

describe('classifyRegion', () => {
  it('classifies the subtree of a directory directly holding a JSX file', () => {
    const region = classifyRegion(
      ['src/ui/Button.tsx'],
      ['src/ui/Button.tsx', 'src/ui/hooks/use-data.ts', 'src/ui', 'src/lib/util.ts'],
    );
    expect(region.has('src/ui/Button.tsx')).toBe(true);
    expect(region.has('src/ui/hooks/use-data.ts')).toBe(true);
    expect(region.has('src/ui')).toBe(true);
    expect(region.has('src/lib/util.ts')).toBe(false);
  });

  it('does not propagate the region upward to the parent directory', () => {
    const region = classifyRegion(['src/ui/Button.tsx'], ['src/ui/Button.tsx', 'src/app.ts']);
    expect(region.has('src/app.ts')).toBe(false);
  });

  it('unions the subtrees of multiple roots', () => {
    const region = classifyRegion(
      ['src/ui/Button.tsx', 'src/widgets/Card.tsx'],
      ['src/ui/Button.tsx', 'src/ui/x.ts', 'src/widgets/Card.tsx', 'src/widgets/y.ts'],
    );
    expect(region.has('src/ui/x.ts')).toBe(true);
    expect(region.has('src/widgets/y.ts')).toBe(true);
  });

  it('makes sourceRoot a root when a JSX file sits directly in it', () => {
    const region = classifyRegion(['src/App.tsx'], ['src/App.tsx', 'src/lib/util.ts']);
    expect(region.has('src/lib/util.ts')).toBe(true);
  });

  it('returns an empty set when there are no JSX-bearing files', () => {
    const region = classifyRegion([], ['src/lib/util.ts', 'src/app.ts']);
    expect(region.size).toBe(0);
  });
});

describe('classifyRegionFromPrefixes', () => {
  it('classifies every id at or below a listed prefix', () => {
    const region = classifyRegionFromPrefixes(
      ['src/ui'],
      ['src/ui', 'src/ui/Button.tsx', 'src/lib/util.ts'],
    );
    expect(region.has('src/ui')).toBe(true);
    expect(region.has('src/ui/Button.tsx')).toBe(true);
    expect(region.has('src/lib/util.ts')).toBe(false);
  });

  it('unions multiple prefixes', () => {
    const region = classifyRegionFromPrefixes(
      ['src/ui', 'src/widgets'],
      ['src/ui/a.ts', 'src/widgets/b.ts', 'src/lib/c.ts'],
    );
    expect(region.has('src/ui/a.ts')).toBe(true);
    expect(region.has('src/widgets/b.ts')).toBe(true);
    expect(region.has('src/lib/c.ts')).toBe(false);
  });

  it('returns an empty set for an empty prefix list', () => {
    expect(classifyRegionFromPrefixes([], ['src/ui/a.ts']).size).toBe(0);
  });
});
