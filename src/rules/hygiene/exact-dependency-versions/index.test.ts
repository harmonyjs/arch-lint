/**
 * @fileoverview Tests for the exact-dependency-versions rule of the hygiene pack.
 */

import { describe, expect, it } from 'vitest';
import { parsePackageJson } from '#foundation/manifest/package-json.js';
import type { ManifestBundle } from '#platform/engine/types.js';
import { makeManifestContext } from '#rules/test-support/make-context.js';
import { only } from '#rules/test-support/only.js';

import { exactDependencyVersions } from './index.js';

function run(packageJson: string, options: Record<string, unknown>) {
  const manifests: ManifestBundle = {
    packageJson: parsePackageJson(packageJson),
    npmrc: null,
    tsconfig: null,
  };
  const ctx = makeManifestContext('exact-dependency-versions', {
    severity: 'error',
    options,
    manifests,
  });
  return exactDependencyVersions.check(ctx);
}

describe('exact-dependency-versions', () => {
  it('passes exact pinned versions', () => {
    const ds = run('{"dependencies":{"zod":"4.4.3"}}', { sections: ['dependencies'] });
    expect(ds).toEqual([]);
  });

  it('flags a caret range', () => {
    const ds = run('{"dependencies":{"zod":"^4.4.3"}}', { sections: ['dependencies'] });
    const d = only(ds);
    expect(d.fingerprint).toBe('dependencies#zod');
    expect(d.entity).toBe('package.json');
    expect(d.location.file).toBe('package.json');
  });

  it('flags a tilde range and a dist-tag', () => {
    const ds = run('{"devDependencies":{"a":"~1.0.0","b":"latest"}}', {
      sections: ['devDependencies'],
    });
    expect(ds.map((d) => d.fingerprint).sort()).toEqual(['devDependencies#a', 'devDependencies#b']);
  });

  it('ignores peerDependencies even if listed in sections', () => {
    const ds = run('{"peerDependencies":{"react":"^18.0.0"}}', {
      sections: ['dependencies', 'devDependencies', 'peerDependencies'],
    });
    expect(ds).toEqual([]);
  });

  it('ignores workspace and file protocols', () => {
    const ds = run('{"dependencies":{"pkg":"workspace:*","local":"file:../local"}}', {
      sections: ['dependencies'],
    });
    expect(ds).toEqual([]);
  });
});
