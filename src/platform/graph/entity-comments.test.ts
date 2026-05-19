/**
 * @fileoverview Tests for collectEntityComments — the ts-morph-free comment
 * model: anchor-resolved leading comments and the no-anchor file-comment scan.
 */

import { Project, type SourceFile } from 'ts-morph';
import { describe, expect, it } from 'vitest';
import { collectEntityComments } from './entity-comments.js';

function sf(code: string): SourceFile {
  return new Project({ useInMemoryFileSystem: true }).createSourceFile(
    'src/Widget/Widget.tsx',
    code,
  );
}

describe('collectEntityComments — anchor resolved', () => {
  it('returns an empty comment list when the anchor has no leading comment', () => {
    const result = collectEntityComments(sf('export const Widget = () => null;'), 'Widget');
    expect(result).toEqual({ anchor: 'resolved', comments: [] });
  });

  it('collects a single-line leading comment above the anchor', () => {
    const result = collectEntityComments(
      sf('// @arch-decision: a reason long enough here\nexport const Widget = () => null;'),
      'Widget',
    );
    expect(result.anchor).toBe('resolved');
    if (result.anchor !== 'resolved') throw new Error('expected resolved');
    expect(result.comments).toHaveLength(1);
    expect(result.comments[0]?.rawText).toBe('// @arch-decision: a reason long enough here');
    expect(result.comments[0]?.kind).toBe('leading-comment');
    expect(result.comments[0]?.distanceLines).toBe(0);
  });

  it('classifies a JSDoc block as kind jsdoc', () => {
    const result = collectEntityComments(
      sf(
        '/**\n * @arch-decision: jsdoc reason long enough\n */\nexport const Widget = () => null;',
      ),
      'Widget',
    );
    if (result.anchor !== 'resolved') throw new Error('expected resolved');
    expect(result.comments[0]?.kind).toBe('jsdoc');
  });

  it('classifies a non-JSDoc block comment as kind leading-comment', () => {
    const result = collectEntityComments(
      sf('/* @arch-decision: block comment reason */\nexport const Widget = () => null;'),
      'Widget',
    );
    if (result.anchor !== 'resolved') throw new Error('expected resolved');
    expect(result.comments[0]?.kind).toBe('leading-comment');
  });

  it('reports the blank-line gap as distanceLines', () => {
    const result = collectEntityComments(
      sf('// @arch-decision: a distant reason here\n\n\n\nexport const Widget = () => null;'),
      'Widget',
    );
    if (result.anchor !== 'resolved') throw new Error('expected resolved');
    expect(result.comments[0]?.distanceLines).toBe(3);
  });
});

describe('collectEntityComments — anchor absent', () => {
  it('returns every file comment when there is no anchor', () => {
    const result = collectEntityComments(
      sf('// @arch-decision: stray decision with no main export\nexport const helper = 1;'),
      'Widget',
    );
    expect(result.anchor).toBe('absent');
    if (result.anchor !== 'absent') throw new Error('expected absent');
    expect(result.fileComments).toHaveLength(1);
    expect(result.fileComments[0]?.rawText).toContain('@arch-decision');
  });

  it('does not collect a marker that lives inside a string literal', () => {
    const result = collectEntityComments(
      sf("export const defaultMarker = '@arch-decision';\nexport const helper = 1;"),
      'Widget',
    );
    if (result.anchor !== 'absent') throw new Error('expected absent');
    expect(result.fileComments).toEqual([]);
  });
});
