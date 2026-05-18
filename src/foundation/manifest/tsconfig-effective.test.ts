/**
 * @fileoverview Tests for the effective tsconfig resolver (with extends) and key positions (D5).
 */

import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { effectiveCompilerOptions } from './tsconfig-effective.js';

function fixture(files: Record<string, string>): string {
  const dir = mkdtempSync(join(tmpdir(), 'arch-lint-tsc-'));
  for (const [name, content] of Object.entries(files)) {
    writeFileSync(join(dir, name), content);
  }
  return join(dir, 'tsconfig.json');
}

describe('effectiveCompilerOptions', () => {
  it('reads compilerOptions declared directly in the file', () => {
    const path = fixture({ 'tsconfig.json': '{"compilerOptions":{"strict":true}}' });
    expect(effectiveCompilerOptions(path).getOption('strict')).toBe(true);
  });

  it('resolves an option inherited via extends', () => {
    const path = fixture({
      'base.json': '{"compilerOptions":{"strict":true}}',
      'tsconfig.json': '{"extends":"./base.json","compilerOptions":{}}',
    });
    expect(effectiveCompilerOptions(path).getOption('strict')).toBe(true);
  });

  it('locates a directly declared key at its own line', () => {
    const path = fixture({
      'tsconfig.json': '{\n  "compilerOptions": {\n    "strict": false\n  }\n}\n',
    });
    expect(effectiveCompilerOptions(path).keyLocation('strict')).toEqual({
      file: path,
      line: 3,
      column: 5,
    });
  });

  it('locates an inherited key at the extends line', () => {
    const path = fixture({
      'base.json': '{"compilerOptions":{"strict":true}}',
      'tsconfig.json': '{\n  "extends": "./base.json",\n  "compilerOptions": {}\n}\n',
    });
    expect(effectiveCompilerOptions(path).keyLocation('strict')).toEqual({
      file: path,
      line: 2,
      column: 3,
    });
  });

  it('falls back to root location when neither key nor extends present', () => {
    const path = fixture({ 'tsconfig.json': '{"compilerOptions":{"strict":true}}' });
    expect(effectiveCompilerOptions(path).keyLocation('noImplicitAny')).toEqual({
      file: path,
      line: 1,
      column: 1,
    });
  });
});
