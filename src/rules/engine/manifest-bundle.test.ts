/**
 * @fileoverview Tests for buildManifestBundle — once-per-run manifest parsing.
 */

import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import type { ResolvedConfig } from '#config/types.js';
import { buildManifestBundle } from './manifest-bundle.js';

function cfg(cwd: string): ResolvedConfig {
  return {
    project: { tsconfig: 'tsconfig.json', sourceRoot: 'src', cwd, includeOutOfRoot: false },
  } as ResolvedConfig;
}

describe('buildManifestBundle', () => {
  it('parses a present package.json and leaves the others null', () => {
    const dir = mkdtempSync(join(tmpdir(), 'arch-lint-bundle-'));
    writeFileSync(join(dir, 'package.json'), '{"engines":{"node":">=22"}}');
    const bundle = buildManifestBundle(cfg(dir));
    expect(bundle.packageJson).not.toBeNull();
    expect(bundle.packageJson?.getSection('engines')).toEqual({ node: '>=22' });
    expect(bundle.npmrc).toBeNull();
    expect(bundle.tsconfig).toBeNull();
  });

  it('returns an all-null bundle for an empty project directory', () => {
    const dir = mkdtempSync(join(tmpdir(), 'arch-lint-bundle-empty-'));
    const bundle = buildManifestBundle(cfg(dir));
    expect(bundle.packageJson).toBeNull();
    expect(bundle.npmrc).toBeNull();
    expect(bundle.tsconfig).toBeNull();
  });
});
