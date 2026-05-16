/**
 * @fileoverview Tests for locating the main-export anchor declaration of an entity.
 */
import { describe, it, expect } from 'vitest';
import { Project, type SourceFile } from 'ts-morph';
import { findAnchorDeclaration } from './anchor.js';

function sf(code: string): SourceFile {
  return new Project({ useInMemoryFileSystem: true }).createSourceFile('src/Widget.tsx', code);
}

describe('findAnchorDeclaration — basename-named export', () => {
  it('finds an exported function named after the entity', () => {
    const anchor = findAnchorDeclaration(sf('export function Widget() { return null; }'), 'Widget');
    expect(anchor).not.toBeNull();
    expect(anchor?.getStartLineNumber()).toBe(1);
  });

  it('finds an exported const named after the entity', () => {
    const anchor = findAnchorDeclaration(
      sf('const other = 1;\nexport const Widget = () => null;'),
      'Widget',
    );
    expect(anchor?.getStartLineNumber()).toBe(2);
  });

  it('finds an exported class named after the entity', () => {
    const anchor = findAnchorDeclaration(sf('export class Widget {}'), 'Widget');
    expect(anchor).not.toBeNull();
  });

  it('returns null when no export matches the entity name and no default exists', () => {
    const anchor = findAnchorDeclaration(sf('export const helper = 1;'), 'Widget');
    expect(anchor).toBeNull();
  });

  it('prefers the basename-named export over an also-present default export', () => {
    const anchor = findAnchorDeclaration(
      sf('export const Widget = () => null;\nexport default function legacy() {}'),
      'Widget',
    );
    expect(anchor?.getStartLineNumber()).toBe(1);
  });
});

describe('findAnchorDeclaration — default fallback and anonymous default', () => {
  it('falls back to a named default export when no basename match', () => {
    const anchor = findAnchorDeclaration(
      sf('export default function legacy() { return null; }'),
      'Widget',
    );
    expect(anchor).not.toBeNull();
  });

  it('anchors on an anonymous default function declaration', () => {
    const anchor = findAnchorDeclaration(sf('export default function () { return null; }'), 'Widget');
    expect(anchor).not.toBeNull();
  });

  it('anchors on an anonymous default arrow expression', () => {
    const anchor = findAnchorDeclaration(sf('export default () => null;'), 'Widget');
    expect(anchor).not.toBeNull();
    expect(anchor?.getStartLineNumber()).toBe(1);
  });

  it('anchors on an anonymous default object literal', () => {
    const anchor = findAnchorDeclaration(sf('export default { a: 1, b: 2 };'), 'Widget');
    expect(anchor).not.toBeNull();
  });

  it('returns null for a file with neither basename-named nor default export', () => {
    const anchor = findAnchorDeclaration(
      sf('export const helperOne = 1;\nexport const helperTwo = 2;'),
      'Widget',
    );
    expect(anchor).toBeNull();
  });

  it('returns null for an entry file with no exports at all', () => {
    const anchor = findAnchorDeclaration(sf('const internal = 1;'), 'Widget');
    expect(anchor).toBeNull();
  });
});
