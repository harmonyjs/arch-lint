/**
 * @fileoverview Tests for the tsconfig-strict rule of the hygiene pack.
 */

import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { effectiveCompilerOptions } from '#rules/hygiene/support/tsconfig-effective.js';
import { makeManifestContext } from '#rules/test-support/make-context.js';
import { only } from '#rules/test-support/only.js';
import type { ManifestBundle } from '#rules/types.js';

import { tsconfigStrict } from './index.js';

function run(tsconfig: string | null, options: Record<string, unknown>) {
  let tsconfigDoc: ManifestBundle['tsconfig'] = null;
  if (tsconfig !== null) {
    const dir = mkdtempSync(join(tmpdir(), 'arch-lint-tsstrict-'));
    const path = join(dir, 'tsconfig.json');
    writeFileSync(path, tsconfig);
    tsconfigDoc = effectiveCompilerOptions(path);
  }
  const manifests: ManifestBundle = { packageJson: null, npmrc: null, tsconfig: tsconfigDoc };
  const ctx = makeManifestContext('tsconfig-strict', { severity: 'error', options, manifests });
  return tsconfigStrict.check(ctx);
}

describe('tsconfig-strict', () => {
  it('passes a strictest tsconfig', () => {
    const ds = run(
      JSON.stringify({
        compilerOptions: {
          strict: true,
          noUncheckedIndexedAccess: true,
          noImplicitOverride: true,
          noImplicitReturns: true,
          noFallthroughCasesInSwitch: true,
          exactOptionalPropertyTypes: true,
          noPropertyAccessFromIndexSignature: true,
        },
      }),
      { preset: 'strictest' },
    );
    expect(ds).toEqual([]);
  });

  it('flags an explicitly disabled strict', () => {
    const ds = run('{"compilerOptions":{"strict":false}}', { preset: 'recommended' });
    const d = only(ds);
    expect(d.ruleId).toBe('tsconfig-strict');
    expect(d.entity).toBe('tsconfig.json');
    expect(d.fingerprint).toBe('strict');
    expect(d.actual).toContain('false');
    expect(d.location.file).toBe('tsconfig.json');
  });

  it('flags a missing strictest sub-flag', () => {
    const ds = run('{"compilerOptions":{"strict":true}}', { preset: 'strictest' });
    expect(ds.map((d) => d.fingerprint).sort()).toEqual([
      'exactOptionalPropertyTypes',
      'noFallthroughCasesInSwitch',
      'noImplicitOverride',
      'noImplicitReturns',
      'noPropertyAccessFromIndexSignature',
      'noUncheckedIndexedAccess',
    ]);
  });

  it('honours ignoreFlags', () => {
    const ds = run('{"compilerOptions":{"strict":true}}', {
      preset: 'strict',
      ignoreFlags: ['noUncheckedIndexedAccess', 'noImplicitOverride'],
    });
    expect(ds).toEqual([]);
  });

  it('honours additionalFlags', () => {
    const ds = run('{"compilerOptions":{"strict":true}}', {
      preset: 'recommended',
      additionalFlags: ['noUnusedLocals'],
    });
    expect(only(ds).fingerprint).toBe('noUnusedLocals');
  });

  it('returns nothing when tsconfig.json is absent', () => {
    expect(run(null, { preset: 'strictest' })).toEqual([]);
  });
});
