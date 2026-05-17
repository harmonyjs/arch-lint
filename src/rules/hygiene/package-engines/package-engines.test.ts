/**
 * @fileoverview Tests for the package-engines rule of the hygiene pack.
 */

import { describe, expect, it } from 'vitest';
import { makeManifestContext } from '../../test-support/make-context.js';
import type { ManifestBundle } from '../../types.js';
import { parsePackageJson } from '../support/package-json.js';

import { packageEngines } from './index.js';

function run(packageJson: string | null, options: Record<string, unknown>) {
  const manifests: ManifestBundle = {
    packageJson: packageJson === null ? null : parsePackageJson(packageJson),
    npmrc: null,
    tsconfig: null,
  };
  const ctx = makeManifestContext('package-engines', { severity: 'error', options, manifests });
  return packageEngines.check(ctx);
}

describe('package-engines', () => {
  it('passes when all required engine keys are declared', () => {
    const ds = run('{"engines":{"node":">=22","npm":">=10"}}', { requiredKeys: ['node', 'npm'] });
    expect(ds).toEqual([]);
  });

  it('flags a missing engine key', () => {
    const ds = run('{"engines":{"node":">=22"}}', { requiredKeys: ['node', 'npm'] });
    expect(ds).toHaveLength(1);
    expect(ds[0]!.fingerprint).toBe('npm');
    expect(ds[0]!.entity).toBe('package.json');
    expect(ds[0]!.location.file).toBe('package.json');
  });

  it('flags every missing key when engines is absent', () => {
    const ds = run('{"name":"demo"}', { requiredKeys: ['node', 'npm'] });
    expect(ds.map((d) => d.fingerprint).sort()).toEqual(['node', 'npm']);
  });

  it('returns nothing when package.json is absent', () => {
    expect(run(null, { requiredKeys: ['node'] })).toEqual([]);
  });
});
