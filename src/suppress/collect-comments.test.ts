/**
 * @fileoverview Tests for collecting leading comments and JSDoc above a declaration.
 */

import { Project } from 'ts-morph';
import { describe, expect, it } from 'vitest';
import { only } from '../rules/test-support/only.js';
import type { SuppressConfig } from '../types.js';
import { collectSuppressComments } from './collect-comments.js';

const cfg: SuppressConfig = {
  marker: '@arch-decision',
  minReasonLength: 12,
  expirySupport: true,
  scanLocations: ['leading-comment', 'jsdoc'],
  maxDistanceLines: 5,
};

function firstExport(code: string) {
  const project = new Project({ useInMemoryFileSystem: true });
  const sf = project.createSourceFile('src/a.ts', code);
  return only(only([...sf.getExportedDeclarations().values()]));
}

describe('collectSuppressComments', () => {
  it('collects a single-line leading comment directly above the declaration', () => {
    const decl = firstExport('// @arch-decision: a reason long enough here\nexport const a = 1;');
    const comments = collectSuppressComments(decl, cfg);
    expect(comments.map((c) => c.text)).toEqual(['@arch-decision: a reason long enough here']);
    expect(comments[0]?.location.line).toBe(1);
  });

  it('collects a multi-line block comment', () => {
    const decl = firstExport('/* @arch-decision: block comment reason */\nexport const a = 1;');
    const comments = collectSuppressComments(decl, cfg);
    expect(comments[0]?.text).toContain('@arch-decision: block comment reason');
  });

  it('collects a JSDoc block above the declaration', () => {
    const decl = firstExport(
      '/**\n * @arch-decision: jsdoc reason long enough\n */\nexport const a = 1;',
    );
    const comments = collectSuppressComments(decl, cfg);
    expect(comments[0]?.text).toContain('@arch-decision: jsdoc reason long enough');
  });

  it('ignores a comment farther than maxDistanceLines blank lines away', () => {
    const decl = firstExport(
      '// @arch-decision: too far away reason\n\n\n\n\n\n\nexport const a = 1;',
    );
    const comments = collectSuppressComments(decl, { ...cfg, maxDistanceLines: 5 });
    expect(comments).toEqual([]);
  });

  it('keeps a comment exactly maxDistanceLines blank lines away', () => {
    const decl = firstExport(
      '// @arch-decision: borderline distance reason\n\n\n\n\n\nexport const a = 1;',
    );
    const comments = collectSuppressComments(decl, { ...cfg, maxDistanceLines: 5 });
    expect(comments).toHaveLength(1);
  });

  it('returns empty array when there is no comment', () => {
    const decl = firstExport('export const a = 1;');
    expect(collectSuppressComments(decl, cfg)).toEqual([]);
  });
});
