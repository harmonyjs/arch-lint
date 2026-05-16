/**
 * @fileoverview Tests for the manifest path resolver of the hygiene pack.
 */
import { describe, it, expect } from 'vitest';
import { manifestPath } from './manifest-path.js';
import type { ResolvedConfig } from '../../types.js';

function configWithCwd(cwd: string): ResolvedConfig {
  return { project: { tsconfig: 't', sourceRoot: 'src', cwd, includeOutOfRoot: false } } as ResolvedConfig;
}

describe('manifestPath', () => {
  it('joins cwd with the manifest name', () => {
    expect(manifestPath(configWithCwd('/repo'), 'package.json')).toBe('/repo/package.json');
  });

  it('resolves .npmrc relative to cwd', () => {
    expect(manifestPath(configWithCwd('/repo'), '.npmrc')).toBe('/repo/.npmrc');
  });
});
