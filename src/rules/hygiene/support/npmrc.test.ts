/**
 * @fileoverview Tests for the line-aware INI parser of .npmrc (D5).
 */
import { describe, expect, it } from 'vitest';
import { parseNpmrc } from './npmrc.js';

const SAMPLE = [
  '; npm config',
  'engine-strict=true',
  '',
  '  save-exact = true',
  '# trailing comment',
].join('\n');

describe('parseNpmrc', () => {
  it('reads a key value', () => {
    expect(parseNpmrc(SAMPLE).get('engine-strict')).toBe('true');
  });

  it('trims whitespace around key and value', () => {
    expect(parseNpmrc(SAMPLE).get('save-exact')).toBe('true');
  });

  it('reports the line and column of a key', () => {
    expect(parseNpmrc(SAMPLE).keyLocation('engine-strict')).toEqual({
      file: '',
      line: 2,
      column: 1,
    });
  });

  it('reports the column past leading whitespace', () => {
    expect(parseNpmrc(SAMPLE).keyLocation('save-exact')).toEqual({
      file: '',
      line: 4,
      column: 3,
    });
  });

  it('returns null for an absent key', () => {
    expect(parseNpmrc(SAMPLE).get('missing')).toBeNull();
    expect(parseNpmrc(SAMPLE).keyLocation('missing')).toBeNull();
  });

  it('ignores comment and blank lines', () => {
    expect(parseNpmrc(SAMPLE).keys()).toEqual(['engine-strict', 'save-exact']);
  });

  it('ignores a line with no equals sign', () => {
    expect(parseNpmrc('not-a-pair\nsave-exact=true\n').keys()).toEqual(['save-exact']);
  });

  it('exposes a root location', () => {
    expect(parseNpmrc(SAMPLE).rootLocation()).toEqual({ file: '', line: 1, column: 1 });
  });
});
