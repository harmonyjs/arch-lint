/**
 * @fileoverview Tests for stripCommentGlyphs — line, block and JSDoc glyphs.
 */

import { describe, expect, it } from 'vitest';
import { stripCommentGlyphs } from './strip.js';

describe('stripCommentGlyphs', () => {
  it('strips a single-line comment glyph', () => {
    expect(stripCommentGlyphs('// @arch-decision: a reason here')).toBe(
      '@arch-decision: a reason here',
    );
  });
  it('strips block comment delimiters', () => {
    expect(stripCommentGlyphs('/* @arch-decision: block reason */')).toBe(
      '@arch-decision: block reason',
    );
  });
  it('strips JSDoc delimiters and per-line star glyphs', () => {
    expect(stripCommentGlyphs('/**\n * @arch-decision: jsdoc reason\n */')).toBe(
      '@arch-decision: jsdoc reason',
    );
  });
  it('collapses a multi-line JSDoc body into one space-joined line', () => {
    expect(stripCommentGlyphs('/**\n * first line\n * second line\n */')).toBe(
      'first line second line',
    );
  });
});
