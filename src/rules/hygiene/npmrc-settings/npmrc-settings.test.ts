/**
 * @fileoverview Tests for the npmrc-settings rule of the hygiene pack.
 */

import { describe, expect, it } from 'vitest';
import { makeManifestContext } from '../../test-support/make-context.js';
import type { ManifestBundle } from '../../types.js';
import { parseNpmrc } from '../support/npmrc.js';

import { npmrcSettings } from './index.js';

function run(npmrc: string | null, options: Record<string, unknown>) {
  const manifests: ManifestBundle = {
    packageJson: null,
    npmrc: npmrc === null ? null : parseNpmrc(npmrc),
    tsconfig: null,
  };
  const ctx = makeManifestContext('npmrc-settings', { severity: 'error', options, manifests });
  return npmrcSettings.check(ctx);
}

describe('npmrc-settings', () => {
  it('passes when all required pairs are present', () => {
    const ds = run('engine-strict=true\nsave-exact=true\n', {
      required: { 'engine-strict': true, 'save-exact': true },
    });
    expect(ds).toEqual([]);
  });

  it('flags a missing required key', () => {
    const ds = run('engine-strict=true\n', {
      required: { 'engine-strict': true, 'save-exact': true },
    });
    expect(ds).toHaveLength(1);
    expect(ds[0]!.fingerprint).toBe('save-exact');
    expect(ds[0]!.entity).toBe('.npmrc');
    expect(ds[0]!.location.file).toBe('.npmrc');
  });

  it('flags a key with the wrong value', () => {
    const ds = run('engine-strict=false\nsave-exact=true\n', {
      required: { 'engine-strict': true, 'save-exact': true },
    });
    expect(ds).toHaveLength(1);
    expect(ds[0]!.fingerprint).toBe('engine-strict');
    expect(ds[0]!.actual).toContain('false');
  });

  it('returns nothing when .npmrc is absent', () => {
    expect(run(null, { required: { 'engine-strict': true, 'save-exact': true } })).toEqual([]);
  });

  it('reports the line of the offending key', () => {
    const ds = run('save-exact=true\nengine-strict=false\n', {
      required: { 'engine-strict': true },
    });
    expect(ds[0]!.location.line).toBe(2);
  });
});
