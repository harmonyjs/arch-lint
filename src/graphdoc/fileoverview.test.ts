/**
 * @fileoverview Tests for @fileoverview text extraction.
 */
import { Project, type SourceFile } from 'ts-morph';
import { describe, expect, it } from 'vitest';
import type { SourceFileSet } from '#graph/discover-source-files.js';
import { extractFileoverviews, fileoverviewOf } from './fileoverview.js';

describe('fileoverviewOf', () => {
  it('extracts and unwraps a multi-line @fileoverview block', () => {
    const text = [
      '/**',
      ' * @fileoverview First line',
      ' * second line.',
      ' */',
      'export const x = 1;',
    ].join('\n');
    expect(fileoverviewOf(text)).toBe('First line second line.');
  });

  it('returns null when there is no @fileoverview tag', () => {
    expect(fileoverviewOf('export const x = 1;\n')).toBeNull();
  });

  it('returns null for an empty file', () => {
    expect(fileoverviewOf('')).toBeNull();
  });

  it('ignores a @fileoverview that is not in the leading JSDoc block', () => {
    const text = 'import { x } from "y";\n/** @fileoverview Late. */\nexport const z = 1;\n';
    expect(fileoverviewOf(text)).toBeNull();
  });

  it('returns null for a leading JSDoc block without a @fileoverview tag', () => {
    expect(fileoverviewOf('/** Just a plain JSDoc. */\nexport const x = 1;\n')).toBeNull();
  });

  it('returns null for an unterminated JSDoc block', () => {
    expect(fileoverviewOf('/** @fileoverview Unterminated')).toBeNull();
  });

  it('returns null when the @fileoverview tag has no text', () => {
    expect(fileoverviewOf(['/**', ' * @fileoverview', ' */'].join('\n'))).toBeNull();
  });
});

describe('extractFileoverviews', () => {
  it('maps each file id to its @fileoverview text, null when absent', () => {
    const project = new Project({ useInMemoryFileSystem: true });
    const documented = project.createSourceFile(
      'src/documented.ts',
      ['/**', ' * @fileoverview Documented module.', ' */', 'export const a = 1;'].join('\n'),
    );
    const undocumented = project.createSourceFile('src/undocumented.ts', 'export const b = 2;\n');
    const files = new Map<string, SourceFile>([
      ['src/documented.ts', documented],
      ['src/undocumented.ts', undocumented],
    ]);
    const set: SourceFileSet = { project, files, rootDir: 'src', cwd: '.' };

    const result = extractFileoverviews(set);

    expect(result.size).toBe(2);
    expect(result.get('src/documented.ts')).toBe('Documented module.');
    expect(result.get('src/undocumented.ts')).toBeNull();
  });
});
