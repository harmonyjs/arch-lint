/**
 * @fileoverview Tests for the manifest path resolver of the hygiene pack.
 */
import { describe, expect, it } from 'vitest';
import type { ResolvedConfig } from '#foundation/config/types.js';
import { manifestPath } from './manifest-path.js';

function configWithCwd(cwd: string): ResolvedConfig {
  return {
    project: { tsconfig: 't', sourceRoot: 'src', cwd, includeOutOfRoot: false },
  } as ResolvedConfig;
}

describe('manifestPath', () => {
  it('joins cwd with the manifest name', () => {
    expect(manifestPath(configWithCwd('/repo'), 'package.json')).toBe('/repo/package.json');
  });

  it('resolves .npmrc relative to cwd', () => {
    expect(manifestPath(configWithCwd('/repo'), '.npmrc')).toBe('/repo/.npmrc');
  });
});
