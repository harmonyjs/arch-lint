/**
 * @fileoverview Tests for the position-aware package.json JSON-AST parser (D5).
 */
import { describe, it, expect } from 'vitest';
import { parsePackageJson } from './package-json.js';

const SAMPLE = [
  '{',
  '  "name": "demo",',
  '  "engines": {',
  '    "node": ">=22"',
  '  },',
  '  "dependencies": {',
  '    "zod": "^4.0.0"',
  '  }',
  '}',
  '',
].join('\n');

describe('parsePackageJson', () => {
  it('reads a top-level string value', () => {
    expect(parsePackageJson(SAMPLE).getString('name')).toBe('demo');
  });

  it('reads a nested section as a key-value record', () => {
    expect(parsePackageJson(SAMPLE).getSection('engines')).toEqual({ node: '>=22' });
  });

  it('reports the location of a top-level key', () => {
    const loc = parsePackageJson(SAMPLE).keyLocation('engines');
    expect(loc).toEqual({ file: '', line: 3, column: 3 });
  });

  it('reports the location of a nested key', () => {
    const loc = parsePackageJson(SAMPLE).sectionKeyLocation('dependencies', 'zod');
    expect(loc).toEqual({ file: '', line: 7, column: 5 });
  });

  it('returns null for an absent key', () => {
    expect(parsePackageJson(SAMPLE).getString('missing')).toBeNull();
    expect(parsePackageJson(SAMPLE).keyLocation('missing')).toBeNull();
  });

  it('returns null for an absent section and absent nested key', () => {
    expect(parsePackageJson(SAMPLE).getSection('scripts')).toBeNull();
    expect(parsePackageJson(SAMPLE).sectionKeyLocation('engines', 'deno')).toBeNull();
  });

  it('reports the root location for the document', () => {
    expect(parsePackageJson(SAMPLE).rootLocation()).toEqual({ file: '', line: 1, column: 1 });
  });

  it('tolerates a non-object document', () => {
    const doc = parsePackageJson('42');
    expect(doc.getString('name')).toBeNull();
    expect(doc.getSection('engines')).toBeNull();
  });
});
